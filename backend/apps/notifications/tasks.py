import requests
from celery import shared_task
from django.utils.html import escape
from django_tenants.utils import schema_context

from apps.projects.models import Task
from apps.tenants.models import Client

from .models import Notification


class MailjetError(Exception):
    pass


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_task_assignment_email(self, task_id, schema_name):
    """
    Celery task to send assignment email via Mailjet using the tenant's credentials.
    The worker has no active tenant, so the schema is passed explicitly.
    """
    tenant = Client.objects.filter(schema_name=schema_name).first()
    if not tenant:
        return "Unknown tenant"
    with schema_context(schema_name):
        try:
            return _send_task_assignment_email(tenant, task_id)
        except (requests.RequestException, MailjetError) as exc:
            raise self.retry(exc=exc) from exc


def _send_task_assignment_email(tenant, task_id):
    task = Task.objects.select_related("assignee", "project").filter(id=task_id).first()
    if not task or not task.assignee or not task.assignee.email:
        return "No assignee email"

    keys = tenant.get_decrypted_mailjet_keys()
    api_key = keys.get("api_key")
    secret_key = keys.get("secret_key")
    from_email = keys.get("from_email") or "noreply@teamproject.deep-technologies.com"

    if not api_key or not secret_key:
        # Credentials not yet configured for this tenant, record notification
        Notification.objects.create(
            user=task.assignee,
            channel="email",
            message=f"[Non envoyé - Mailjet non configuré] Assigné à '{task.title}'",
        )
        return "Mailjet credentials not configured"

    # Send through Mailjet API v3.1
    payload = {
        "Messages": [
            {
                "From": {"Email": from_email, "Name": f"{tenant.name} - Team Project"},
                "To": [{"Email": task.assignee.email, "Name": task.assignee.full_name}],
                "Subject": f"Nouvelle tâche assignée : {task.title}",
                "TextPart": f"Bonjour {task.assignee.full_name},\n\nLa tâche '{task.title}' vous a été assignée dans le projet '{task.project.name}'.\nPriorité : {task.get_priority_display()}\nDate d'échéance : {task.due_date or 'Non définie'}\n\nConnectez-vous pour voir les détails.",
                "HTMLPart": f"""
                    <div style="font-family: sans-serif; padding: 20px; color: #333;">
                        <h2>Bonjour {escape(task.assignee.full_name)},</h2>
                        <p>Vous avez une nouvelle tâche assignée dans l'organisation <strong>{escape(tenant.name)}</strong> :</p>
                        <div style="border-left: 4px solid #4f46e5; padding-left: 12px; margin: 16px 0;">
                            <h3 style="margin: 0; color: #111;">{escape(task.title)}</h3>
                            <p style="margin: 4px 0; color: #666;">Projet : <strong>{escape(task.project.name)}</strong></p>
                            <p style="margin: 4px 0; color: #666;">Priorité : <strong>{task.get_priority_display()}</strong></p>
                            <p style="margin: 4px 0; color: #666;">Échéance : <strong>{task.due_date or 'Non définie'}</strong></p>
                        </div>
                        <p style="margin-top: 24px;">L'équipe {escape(tenant.name)}</p>
                    </div>
                """,
            }
        ]
    }

    response = requests.post("https://api.mailjet.com/v3.1/send", auth=(api_key, secret_key), json=payload, timeout=10)

    if response.status_code in [200, 201]:
        Notification.objects.create(
            user=task.assignee, channel="email", message=f"Email envoyé avec succès pour la tâche '{task.title}'"
        )
        return "Email sent successfully"
    else:
        raise MailjetError(f"Mailjet error {response.status_code}: {response.text}")

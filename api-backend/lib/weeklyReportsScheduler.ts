import { generateWeeklyReports } from './weeklyReports';

// Démarrer le scheduler pour les rapports hebdomadaires
export function scheduleWeeklyReports(): void {
    console.log('📅 Démarrage du scheduler de rapports hebdomadaires...');

    // Calculer le temps jusqu'au prochain lundi à minuit
    const now = new Date();
    const nextMonday = new Date(now);
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7; // 0=dimanche, 1=lundi...
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);

    const timeUntilNextMonday = nextMonday.getTime() - now.getTime();
    console.log(`📅 Prochaine exécution des rapports: ${nextMonday.toLocaleString('fr-FR')}`);
    console.log(`⏰ Temps d'attente: ${Math.round(timeUntilNextMonday / (1000 * 60 * 60))} heures`);

    // Programmer l'exécution pour le prochain lundi
    setTimeout(() => {
        console.log('📊 Exécution planifiée des rapports hebdomadaires');
        generateWeeklyReports();

        // Programmer la prochaine exécution (chaque semaine)
        setInterval(() => {
            console.log('📊 Exécution hebdomadaire des rapports');
            generateWeeklyReports();
        }, 7 * 24 * 60 * 60 * 1000); // Chaque semaine

    }, timeUntilNextMonday);
}

// Fonction pour arrêter le scheduler (optionnel)
export function stopWeeklyReportsScheduler(): void {
    console.log('🛑 Arrêt du scheduler de rapports hebdomadaires');
}

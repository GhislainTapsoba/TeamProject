from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

class AuthRateThrottle(AnonRateThrottle):
    """Limits login and password change attempts to prevent brute force."""
    scope = 'auth'

class RegistrationRateThrottle(AnonRateThrottle):
    """Limits tenant creation to prevent schema flooding and DoS."""
    scope = 'registration'

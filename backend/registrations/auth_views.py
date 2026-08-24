from django.contrib.auth import authenticate, login, logout
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView


class LoginView(APIView):
    """POST /api/auth/login/ — admin login. Only staff users (created via
    `manage.py createsuperuser` / Django admin) can sign in; there is no
    public account creation (06_ADMIN.md).

    Returns a DRF auth token for the Next.js admin panel to send as
    `Authorization: Token <token>` on subsequent requests. Token auth avoids
    the cross-site cookie/CSRF complications of session auth between the
    Vercel frontend and Railway backend (two different domains). Also logs
    the Django session in, so /admin/ (Django Admin) keeps working too.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        user = authenticate(request, username=username, password=password)

        if user is None or not user.is_staff:
            return Response({"detail": "Credenciales inválidas."}, status=status.HTTP_401_UNAUTHORIZED)

        login(request, user)
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"username": user.username, "token": token.key})


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.auth is not None:
            request.auth.delete()
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)

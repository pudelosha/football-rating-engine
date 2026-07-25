using Microsoft.AspNetCore.Identity;

namespace FootballResults.Api.Repository.Services;

public static class AuthText
{
    public static string Language(string? language)
    {
        return string.Equals(language, "pl", StringComparison.OrdinalIgnoreCase) ? "pl" : "en";
    }

    public static string Message(string key, string? language)
    {
        var lang = Language(language);
        return lang == "pl" ? Pl(key) : En(key);
    }

    public static string IdentityErrors(IdentityResult result, string? language)
    {
        var lang = Language(language);
        return string.Join(" ", result.Errors.Select(error => IdentityError(error, lang)));
    }

    private static string IdentityError(IdentityError error, string language)
    {
        if (language != "pl")
        {
            return error.Description;
        }

        return error.Code switch
        {
            "DuplicateEmail" => "Użytkownik z tym adresem email już istnieje.",
            "DuplicateUserName" => "Użytkownik z tym adresem email już istnieje.",
            "InvalidEmail" => "Podaj poprawny adres email.",
            "InvalidUserName" => "Podaj poprawny adres email.",
            "PasswordTooShort" => "Hasło jest za krótkie.",
            "PasswordRequiresUniqueChars" => "Hasło musi zawierać więcej unikalnych znaków.",
            "PasswordRequiresNonAlphanumeric" => "Hasło musi zawierać znak specjalny.",
            "PasswordRequiresDigit" => "Hasło musi zawierać cyfrę.",
            "PasswordRequiresLower" => "Hasło musi zawierać małą literę.",
            "PasswordRequiresUpper" => "Hasło musi zawierać wielką literę.",
            "InvalidToken" => "Token jest nieprawidłowy albo wygasł.",
            _ => "Operacja nie powiodła się. Sprawdź dane i spróbuj ponownie."
        };
    }

    private static string En(string key)
    {
        return key switch
        {
            "RegisterDuplicate" => "User with this email already exists.",
            "RegisterSuccess" => "Registered successfully. Check your email to activate your account.",
            "LoginInvalid" => "Invalid email or password.",
            "LoginUnconfirmed" => "Email is not confirmed. Please confirm your email or request a new activation email.",
            "LoginSuccess" => "Logged in successfully.",
            "UserNotFound" => "User was not found.",
            "InvalidConfirmationToken" => "Invalid confirmation token. Request a new confirmation email.",
            "EmailConfirmed" => "Email confirmed.",
            "ResendConfirmationSafe" => "If the account exists and is not confirmed, a confirmation email will be sent.",
            "ForgotPasswordSafe" => "If the account exists, a reset token will be sent.",
            "DevelopmentResetToken" => "Development reset token generated.",
            "InvalidPasswordResetToken" => "Invalid password reset token. Request a new password reset email.",
            "PasswordResetSuccess" => "Password reset successfully.",
            "ProfileUpdated" => "Profile updated.",
            "ProfileUpdateFailed" => "Profile could not be updated.",
            "PasswordChanged" => "Password changed.",
            "PasswordChangeFailed" => "Password could not be changed. Check the current password and new password requirements.",
            "EmailChanged" => "Email changed.",
            "EmailChangeFailed" => "Email could not be changed. Check the password and new email address.",
            "ApiKeyRotated" => "API key rotated. Store it now; it will not be shown again.",
            "ApiKeyRotateFailed" => "API key could not be rotated.",
            _ => "Something went wrong. Please try again."
        };
    }

    private static string Pl(string key)
    {
        return key switch
        {
            "RegisterDuplicate" => "Użytkownik z tym adresem email już istnieje.",
            "RegisterSuccess" => "Rejestracja zakończona. Sprawdź email, aby aktywować konto.",
            "LoginInvalid" => "Nieprawidłowy email lub hasło.",
            "LoginUnconfirmed" => "Email nie został potwierdzony. Potwierdź email albo poproś o nową wiadomość aktywacyjną.",
            "LoginSuccess" => "Logowanie zakończone sukcesem.",
            "UserNotFound" => "Nie znaleziono użytkownika.",
            "InvalidConfirmationToken" => "Nieprawidłowy token potwierdzenia. Poproś o nowy email aktywacyjny.",
            "EmailConfirmed" => "Email został potwierdzony.",
            "ResendConfirmationSafe" => "Jeśli konto istnieje i nie jest potwierdzone, wyślemy email aktywacyjny.",
            "ForgotPasswordSafe" => "Jeśli konto istnieje, wyślemy token resetowania hasła.",
            "DevelopmentResetToken" => "Wygenerowano token resetowania hasła w trybie deweloperskim.",
            "InvalidPasswordResetToken" => "Nieprawidłowy token resetowania hasła. Poproś o nowy link resetujący.",
            "PasswordResetSuccess" => "Hasło zostało zresetowane.",
            "ProfileUpdated" => "Profil zaktualizowany.",
            "ProfileUpdateFailed" => "Nie udało się zaktualizować profilu.",
            "PasswordChanged" => "Hasło zostało zmienione.",
            "PasswordChangeFailed" => "Nie udało się zmienić hasła. Sprawdź aktualne hasło i wymagania dla nowego hasła.",
            "EmailChanged" => "Email został zmieniony.",
            "EmailChangeFailed" => "Nie udało się zmienić emaila. Sprawdź hasło i nowy adres email.",
            "ApiKeyRotated" => "API key został zmieniony. Zapisz go teraz; nie będzie ponownie pokazany.",
            "ApiKeyRotateFailed" => "Nie udało się wygenerować nowego API key.",
            _ => "Coś poszło nie tak. Spróbuj ponownie."
        };
    }
}

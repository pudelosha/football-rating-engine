using Microsoft.AspNetCore.WebUtilities;
using System.Text;

namespace FootballResults.Api.Repository.Services;

public static class IdentityTokenUrlDecoder
{
    private const string Base64UrlPrefix = "v2_";

    public static string Encode(string token)
    {
        var bytes = Encoding.UTF8.GetBytes(token);
        return Base64UrlPrefix + WebEncoders.Base64UrlEncode(bytes);
    }

    public static string Decode(string token)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return string.Empty;
        }

        var decodedToken = Uri.UnescapeDataString(token.Trim());
        var trimmedToken = decodedToken.Trim();

        if (trimmedToken.StartsWith(Base64UrlPrefix, StringComparison.Ordinal))
        {
            var encodedToken = RemoveWhitespace(trimmedToken[Base64UrlPrefix.Length..]);
            try
            {
                var bytes = WebEncoders.Base64UrlDecode(encodedToken);
                return Encoding.UTF8.GetString(bytes);
            }
            catch (FormatException exception)
            {
                throw new FormatException("The identity token is not a valid v2 Base64Url token. Request a new confirmation/reset email.", exception);
            }
        }

        return decodedToken.Replace(' ', '+');
    }

    private static string RemoveWhitespace(string value)
    {
        if (!value.Any(char.IsWhiteSpace))
        {
            return value;
        }

        var builder = new StringBuilder(value.Length);
        foreach (var character in value)
        {
            if (!char.IsWhiteSpace(character))
            {
                builder.Append(character);
            }
        }

        return builder.ToString();
    }
}

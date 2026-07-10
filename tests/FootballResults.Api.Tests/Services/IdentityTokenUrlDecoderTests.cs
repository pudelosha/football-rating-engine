using FootballResults.Api.Repository.Services;

namespace FootballResults.Api.Tests.Services;

public sealed class IdentityTokenUrlDecoderTests
{
    [Fact]
    public void EncodeDecode_RoundTripsIdentityToken()
    {
        const string token = "CfDJ8Fbj+dmq/YAmTPJ4aLYt69Km8AAosRQgDb7pr7IWVCAX73Ohej";

        var encoded = IdentityTokenUrlDecoder.Encode(token);
        var decoded = IdentityTokenUrlDecoder.Decode(encoded);

        Assert.StartsWith("v2_", encoded);
        Assert.Equal(token, decoded);
    }

    [Fact]
    public void Decode_RemovesWhitespaceFromEncodedV2Token()
    {
        const string token = "token-with+classic/identity==characters";
        var encoded = IdentityTokenUrlDecoder.Encode(token);
        var wrapped = encoded.Insert(20, "\r\n ");

        var decoded = IdentityTokenUrlDecoder.Decode(wrapped);

        Assert.Equal(token, decoded);
    }

    [Fact]
    public void Decode_InvalidV2Token_ThrowsHelpfulFormatException()
    {
        var exception = Assert.Throws<FormatException>(() => IdentityTokenUrlDecoder.Decode("v2_not valid ###"));

        Assert.Contains("Request a new confirmation/reset email", exception.Message);
    }

    [Fact]
    public void Decode_LegacyToken_RestoresSpacesAsPlusSigns()
    {
        var decoded = IdentityTokenUrlDecoder.Decode("abc def");

        Assert.Equal("abc+def", decoded);
    }
}

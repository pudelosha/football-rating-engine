using FootballResults.Api.DTOs;
using FootballResults.Api.Extensions;
using FootballResults.Api.Model.Database;
using FootballResults.Api.Model.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FootballResults.Api.Controllers;

[ApiController]
[Route("api/admin/ratings/configuration")]
[Authorize(Policy = AuthExtensions.AdminPolicy)]
public sealed class RatingConfigurationController(AppDbContext dbContext) : ControllerBase
{
    private const string DefaultKey = "default";

    [HttpGet]
    [ProducesResponseType(typeof(RatingConfigurationDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<RatingConfigurationDto>> Get(CancellationToken cancellationToken)
    {
        var configuration = await GetOrCreateDefaultAsync(cancellationToken);
        return Ok(ToDto(configuration));
    }

    [HttpPut]
    [ProducesResponseType(typeof(RatingConfigurationDto), StatusCodes.Status200OK)]
    public async Task<ActionResult<RatingConfigurationDto>> Update(
        UpdateRatingConfigurationRequest request,
        CancellationToken cancellationToken)
    {
        if (request.FormMatchCount < 1 || request.PerformanceMatchCount < 1 || request.BootstrapSeasonCount < 0)
        {
            return BadRequest(new AuthActionResponse(false, "Rating configuration contains invalid count values."));
        }

        var configuration = await GetOrCreateDefaultAsync(cancellationToken);
        configuration.BaseEloWeight = request.BaseEloWeight;
        configuration.FormWeight = request.FormWeight;
        configuration.PerformanceWeight = request.PerformanceWeight;
        configuration.SquadQualityWeight = request.SquadQualityWeight;
        configuration.LeagueStrengthWeight = request.LeagueStrengthWeight;
        configuration.UncertaintyPenaltyWeight = request.UncertaintyPenaltyWeight;
        configuration.BaseRating = request.BaseRating;
        configuration.PromotedBaselineRating = request.PromotedBaselineRating;
        configuration.KFactor = request.KFactor;
        configuration.HomeAdvantage = request.HomeAdvantage;
        configuration.BootstrapSeasonCount = request.BootstrapSeasonCount;
        configuration.FormMatchCount = request.FormMatchCount;
        configuration.FormScale = request.FormScale;
        configuration.FormMaxAdjustment = request.FormMaxAdjustment;
        configuration.PerformanceMatchCount = request.PerformanceMatchCount;
        configuration.PerformanceScale = request.PerformanceScale;
        configuration.PerformanceMaxAdjustment = request.PerformanceMaxAdjustment;
        configuration.UpdatedAtUtc = DateTimeOffset.UtcNow;

        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToDto(configuration));
    }

    private async Task<RatingConfiguration> GetOrCreateDefaultAsync(CancellationToken cancellationToken)
    {
        var configuration = await dbContext.RatingConfigurations
            .SingleOrDefaultAsync(item => item.Key == DefaultKey, cancellationToken);

        if (configuration is not null)
        {
            return configuration;
        }

        var now = DateTimeOffset.UtcNow;
        configuration = new RatingConfiguration
        {
            Key = DefaultKey,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        dbContext.RatingConfigurations.Add(configuration);
        await dbContext.SaveChangesAsync(cancellationToken);

        return configuration;
    }

    private static RatingConfigurationDto ToDto(RatingConfiguration configuration)
    {
        return new RatingConfigurationDto(
            configuration.Id,
            configuration.Key,
            configuration.BaseEloWeight,
            configuration.FormWeight,
            configuration.PerformanceWeight,
            configuration.SquadQualityWeight,
            configuration.LeagueStrengthWeight,
            configuration.UncertaintyPenaltyWeight,
            configuration.BaseRating,
            configuration.PromotedBaselineRating,
            configuration.KFactor,
            configuration.HomeAdvantage,
            configuration.BootstrapSeasonCount,
            configuration.FormMatchCount,
            configuration.FormScale,
            configuration.FormMaxAdjustment,
            configuration.PerformanceMatchCount,
            configuration.PerformanceScale,
            configuration.PerformanceMaxAdjustment,
            configuration.UpdatedAtUtc);
    }
}


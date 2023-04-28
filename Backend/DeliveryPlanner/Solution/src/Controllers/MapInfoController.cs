using GoogleApi;
using GoogleApi.Entities.Maps.Elevation.Request;
using Microsoft.AspNetCore.Mvc;
using Solution.Pathfinder;

namespace Solution.Controllers;


[ApiController]
[Route("[controller]")]
public class MapInfoController : ControllerBase
{
    private static readonly RateLimiter elevationRateLimiter = new(10);

    [HttpPost("/elevation")]
    public async Task<double> GetElevation([FromBody] Coordinate coordinate)
    {
        await elevationRateLimiter.WaitForReadyAsync();
        /*
        var request = new ElevationRequest
        {
            Key = GoogleMapService.API_KEY,

        };

        var response = await GoogleMaps.Elevation.QueryAsync(request);
        */

        return 1;
    }
}
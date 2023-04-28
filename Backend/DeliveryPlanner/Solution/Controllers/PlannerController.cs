using Microsoft.AspNetCore.Mvc;
using Solution.Models;

namespace Solution.Controllers;

[ApiController]
[Route("[controller]")]
public class PlannerController : ControllerBase
{
    public static readonly RateLimiter UpdateRateLimiter = new(1);
    public static readonly RateLimiter AddRateLimiter = new(1);

    [HttpGet("/health")]
    public IActionResult CheckHealth()
    {
        return Ok();
    }

    [HttpPost("/address")]
    public async Task<Coordinate> GetCoordinateFromAddress([FromBody] AddressFromCoordsRequest data)
    {
        return await Planner.GetDefaultPathService().GetAddressCoordinates(data.address);
    }

    [HttpPost("/address/closest")]
    public async Task<string> getClosestAddress([FromBody] Coordinate coordinate)
    {
        return await Planner.GetDefaultPathService().GetClosestAddress(coordinate);
    }

    [HttpPost("/update")]
    public async Task updatePath([FromBody] Vehicle vehicle)
    {
        UpdateRateLimiter.Enqueue(async () =>
        {
            await Planner.GeneratePathNodes(vehicle);
            await Planner.FindClosetsDestinationNodes(vehicle);
            await Planner.GenerateDistanceValues(vehicle);
        });
    }

    [HttpGet("/mapmodes")]
    public async Task<List<string>> getMapModes()
    {
        return Planner.mapServices.Keys.ToList();
    }

    [HttpPost("/add")]
    public IActionResult AddPath([FromBody] Delivery data)
    {
        AddRateLimiter.Enqueue(async () => Planner.addPath(data));
        return Ok();
    }

    public class AddressFromCoordsRequest
    {
        public string address { get; set; }
    }
}
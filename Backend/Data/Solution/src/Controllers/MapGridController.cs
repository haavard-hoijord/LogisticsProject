using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Solution.Context;
using Solution.Models;

namespace Solution.Controllers;

[ApiController]
[Route("[controller]")]
public class MapGridController : ControllerBase
{
    public static readonly double GRID_SIZE = Util.baseDistance;

    [HttpGet("/map/grid")]
    public async Task<MapGrid> GetMapGrid([FromBody] Coordinate coordinate)
    {
        int latCord = (int)Math.Round(coordinate.latitude / GRID_SIZE);
        int lngCord = (int)Math.Round(coordinate.longitude / GRID_SIZE);

        using var context = new MysqlContext();
        var grid = await context.mapGrid.SingleOrDefaultAsync(e => e.latKey == latCord && e.lngKey == lngCord);

        if (grid == null)
        {
            grid = await CreateMapGrid(latCord, lngCord);
            await context.mapGrid.AddAsync(grid);
            await context.SaveChangesAsync();
        }

        return grid;
    }

    private static readonly RateLimiter elevationRateLimiter = new(5);

    public async Task<MapGrid> CreateMapGrid(int latCord, int lngCord)
    {
        await elevationRateLimiter.WaitForReadyAsync();
        MapGrid grid = new MapGrid
        {
            latKey = latCord,
            lngKey = lngCord,
            elevation = await Program.client.InvokeMethodAsync<double>(Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "DeliveryPlanner", "elevation", new Coordinate
            {
                latitude = latCord + (GRID_SIZE / 2),
                longitude = lngCord + (GRID_SIZE / 2)
            }))
        };
        return grid;
    }
}
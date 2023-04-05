using GoogleApi.Entities.Maps.Directions.Response;
using Microsoft.AspNetCore.Mvc;
using Solution.Context;
using Route = GoogleApi.Entities.Maps.Directions.Response.Route;

namespace Solution.Controllers;

[ApiController]
[Route("[controller]")]
public class TrackerController : ControllerBase
{
    [HttpGet("/track")]
    public async Task<Models.Vehicle?> track([FromBody] int id)
    {
        await using var context = new MysqlContext();
        return await context.Vehicles.FindAsync(id);
    }

    [HttpGet("/track/all")]
    public async Task<List<Models.Vehicle>> getAll()
    {
        await using var context = new MysqlContext();

        List<Models.Vehicle> vehicles = new List<Models.Vehicle>();
        try
        {
            vehicles.AddRange(context.Vehicles.ToList());
        }
        catch (Exception e)
        {
            Console.WriteLine(e);
        }
        return vehicles;
    }

    [HttpPost("/update")]
    public async void update([FromBody] Models.Vehicle vehicle)
    {
        await using var context = new MysqlContext();
        var entity = await context.Vehicles.FindAsync(vehicle.Id);

        if (entity != null)
        {
            entity.company = vehicle.company;
            entity.coordinate = vehicle.coordinate;
            entity.destinations = vehicle.destinations;
            entity.maxLoad = vehicle.maxLoad;
            entity.nodes = vehicle.nodes;;

            context.Vehicles.Update(entity);
            await context.SaveChangesAsync();
        }
    }

    [HttpPost("/add")]
    public async void add([FromBody] Models.Vehicle vehicle)
    {
        await using var context = new MysqlContext();
        context.Vehicles.Add(vehicle);
        await context.SaveChangesAsync();
    }


    [HttpPost("/delete")]
    public async void delete([FromBody] Models.Vehicle vehicle)
    {
        await using var context = new MysqlContext();
        context.Vehicles.Remove(vehicle);
        await context.SaveChangesAsync();
    }
}
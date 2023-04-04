using GoogleApi.Entities.Maps.Directions.Response;
using Microsoft.AspNetCore.Mvc;
using Solution.Context;
using Solution.Models;
using Route = GoogleApi.Entities.Maps.Directions.Response.Route;
using Vehicle = Solution.Models.Vehicle;

namespace Solution.Controllers;

[ApiController]
[Route("[controller]")]
public class TrackerController : ControllerBase
{
    [HttpGet("/track")]
    public async Task<Vehicle?> track([FromBody] int id)
    {
        await using var context = new MysqlContext();
        return await context.Vehicles.FindAsync(id);
    }

    [HttpGet("/track/all")]
    public async Task<List<Vehicle>> getAll()
    {
        await using var context = new MysqlContext();

        List<Vehicle> vehicles = new List<Vehicle>();
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
    public async void update([FromBody] Vehicle vehicle)
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
    public async void add([FromBody] Vehicle vehicle)
    {
        await using var context = new MysqlContext();
        context.Vehicles.Add(vehicle);
        await context.SaveChangesAsync();
    }


    [HttpPost("/delete")]
    public async void delete([FromBody] Vehicle vehicle)
    {
        await using var context = new MysqlContext();
        // Retrieve the entity using its primary key or another unique identifier
        var entity = await context.Vehicles.FindAsync(vehicle.Id);

        if (entity != null)
        {
            context.Vehicles.Remove(entity);
            await context.SaveChangesAsync();
        }
    }
}
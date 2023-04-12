using System.Text.Json;
using Dapr;
using Microsoft.AspNetCore.Mvc;
using Org.BouncyCastle.Utilities;
using Solution.Models;

namespace Solution.Controllers;

[ApiController]
[Route("[controller]")]
public class PubsubController : ControllerBase
{
    [Consumes("application/json")]
    [HttpPost("pickup")]
    [Topic("delivery_status", "pickup")]
    public async Task<ActionResult> Pickup([FromBody] MessageData data)
    {
        var requestMessage = Program.client.CreateInvokeMethodRequest(HttpMethod.Get, "tracker", "track", data.id);
        Vehicle obj = await Program.client.InvokeMethodAsync<Vehicle>(requestMessage);

        obj.destinations.RemoveAll((destination =>
            destination.isPickup && destination.routeId == data.route));

        var message2 = Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "tracker", "update", obj);
        await Program.client.InvokeMethodAsync(message2);

        var address = await PlannerController.GetPathService(obj).GetClosestAddress(new Coordinate{longitude = data.longitude, latitude = data.latitude});

        Console.WriteLine("Vehicle " + obj.Id + " has picked up a package from " + address + " on route " + data.route);
        return Ok();
    }

    [Consumes("application/json")]
    [HttpPost("delivery")]
    [Topic("delivery_status", "delivery")]
    public async Task<ActionResult> Delivery([FromBody] MessageData data)
    {
        var requestMessage = Program.client.CreateInvokeMethodRequest(HttpMethod.Get, "tracker", "track", data.id);
        Vehicle obj = await Program.client.InvokeMethodAsync<Vehicle>(requestMessage);

        obj.destinations.RemoveAll((destination =>
            !destination.isPickup && destination.routeId == data.route));

        var message2 = Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "tracker", "update", obj);
        await Program.client.InvokeMethodAsync(message2);

        var address = await PlannerController.GetPathService(obj).GetClosestAddress(new Coordinate{longitude = data.longitude, latitude = data.latitude});

        Console.WriteLine("Vehicle " + obj.Id + " has delivered a package to " + address + " on route " + data.route);
        return Ok();
    }

    public class MessageData
    {
        public int id { get; set; }
        public int route { get; set; }
        public double latitude { get; set; }
        public double longitude { get; set; }
    }
}
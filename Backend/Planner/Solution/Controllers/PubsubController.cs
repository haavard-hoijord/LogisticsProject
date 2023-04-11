using Dapr;
using Microsoft.AspNetCore.Mvc;
using Org.BouncyCastle.Utilities;
using Solution.Models;

namespace Solution.Controllers;

[ApiController]
[Route("[controller]")]
public class PubsubController : ControllerBase
{
    [Topic("delivery_status", "pickup")]
    [HttpPost("planner")]
    public async Task<ActionResult> Pickup([FromBody] Dictionary<String, String> data)
    {
        var message = Program.client.CreateInvokeMethodRequest(HttpMethod.Get, "tracker", "track", Int32.Parse(data["id"]));
        Vehicle obj = await Program.client.InvokeMethodAsync<Vehicle>(message);

        obj.destinations.RemoveAll((destination =>
            destination.isPickup && destination.routeId == Int32.Parse(data["route"])));

        var message2 = Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "tracker", "update", obj);
        await Program.client.InvokeMethodAsync(message2);

        Console.WriteLine("Vehicle " + obj.Id + " has picked up a package on route " + Int32.Parse(data["route"]));

        return Ok();
    }

    [Topic("delivery_status", "delivery")]
    [HttpPost("planner")]
    public async Task<ActionResult> Delivery([FromBody] Dictionary<String, String> data)
    {
        var message = Program.client.CreateInvokeMethodRequest(HttpMethod.Get, "tracker", "track", Int32.Parse(data["id"]));
        Vehicle obj = await Program.client.InvokeMethodAsync<Vehicle>(message);

        obj.destinations.RemoveAll((destination =>
            !destination.isPickup && destination.routeId == Int32.Parse(data["route"])));

        var message2 = Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "tracker", "update", obj);
        await Program.client.InvokeMethodAsync(message2);

        Console.WriteLine("Vehicle " + obj.Id + " has delivered a package on route " + Int32.Parse(data["route"]));

        return Ok();
    }
}
using System.Timers;
using Microsoft.AspNetCore.Mvc;
using Solution.Models;

[ApiController]
[Route("[controller]")]
public class SimulationController : ControllerBase
{
    private static readonly double baseDistance = Util.CalculateDistance(new Coordinate
    {
        latitude = 40.0,
        longitude = -100.0
    }, new Coordinate
    {
        latitude = 40.00898315,
        longitude = -100.0
    }); // One km distance

    private static double simSpeed = 1.0;

    [HttpGet("/simulation/speed")]
    public double GetSimulationSpeed()
    {
        return simSpeed;
    }

    [HttpPost("/simulation/speed")]
    public void SetSimulationSpeed([FromBody] double speed)
    {
        simSpeed = speed;
    }

    public static async void RunSimulationTick()
    {
        try
        {
            List<Vehicle> obj = await Program.client.InvokeMethodAsync<List<Vehicle>>(HttpMethod.Get, "tracker", "track/all");

            foreach (var vehicle in obj)
            {
                if (vehicle.nodes.Count > 0)
                {
                    var speedLimit = 50; //50 km/h
                    var incrementDistance = speedLimit / (3600.0 / simSpeed); //1 km/s
                    var remainingDistance = baseDistance * incrementDistance;

                    while (remainingDistance > 0)
                    {
                        if (vehicle.nodes.Count == 0)
                        {
                            break; // No more nodes to visit
                        }

                        Coordinate nextNode = vehicle.nodes.First();
                        double distanceToNextNode = Util.CalculateDistance(vehicle.coordinate, nextNode);


                        if (remainingDistance >= distanceToNextNode)
                        {
                            remainingDistance -= distanceToNextNode;
                            vehicle.coordinate = nextNode;
                            vehicle.nodes.RemoveAt(0);

                            foreach (var dest in vehicle.destinations)
                            {
                                if (dest.closestNode != null)
                                {
                                    if (dest.closestNode.latitude == nextNode.latitude &&
                                        dest.closestNode.longitude == nextNode.longitude)
                                    {
                                        var messageData = new Program.MessageData
                                        {
                                            id = vehicle.id,
                                            route = dest.routeId,
                                            latitude = dest.coordinate.latitude,
                                            longitude = dest.coordinate.longitude
                                        };

                                        Program.client.PublishEventAsync("status", dest.isPickup ? "pickup" : "delivery",
                                            messageData);
                                    }
                                }
                            }
                        }
                        else
                        {
                            double gain = remainingDistance / distanceToNextNode;
                            double latitudeDifference = (nextNode.latitude - vehicle.coordinate.latitude) * gain;
                            double longitudeDifference = (nextNode.longitude - vehicle.coordinate.longitude) * gain;

                            vehicle.coordinate = new Coordinate
                            {
                                latitude = vehicle.coordinate.latitude + latitudeDifference,
                                longitude = vehicle.coordinate.longitude + longitudeDifference
                            };

                            remainingDistance = 0;
                        }
                    }

                    await Program.client.InvokeMethodAsync(HttpMethod.Post, "tracker", "update", vehicle);
                }
                else if (vehicle.destinations.Count > 0)
                {
                    vehicle.destinations.Clear();
                    await Program.client.InvokeMethodAsync(HttpMethod.Post, "tracker", "update", vehicle);
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.ToString());
        }
    }
}
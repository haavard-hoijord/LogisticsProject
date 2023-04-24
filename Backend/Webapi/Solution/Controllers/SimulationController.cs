using System.Timers;
using GoogleApi;
using GoogleApi.Entities.Maps.Common;
using GoogleApi.Entities.Places.Search.NearBy.Request;
using Microsoft.AspNetCore.Mvc;
using Solution.Controllers;
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
        if(simSpeed <= 0)
        {
            return;
        }

        try
        {
            List<Vehicle> obj = await Program.client.InvokeMethodAsync<List<Vehicle>>(HttpMethod.Get, "tracker", "track/all");

            foreach (var vehicle in obj)
            {
                if (vehicle.nodes.Count > 0)
                {
                    var speedLimit = 1; //50 km/h
                    var incrementDistance = speedLimit / (3600.0 / simSpeed); //1 km/s
                    var remainingDistance = baseDistance * incrementDistance;

                    while (remainingDistance > 0)
                    {
                        if (vehicle.nodes.Count == 0)
                        {
                            break; // No more nodes to visit
                        }

                        Node nextNode = vehicle.nodes.First();
                        double distanceToNextNode = Util.CalculateDistance(vehicle.coordinate, nextNode.coordinate);
                        double adjustedRemainingDistance = remainingDistance * nextNode.speedLimit;

                        if (adjustedRemainingDistance >= distanceToNextNode)
                        {
                            remainingDistance -= distanceToNextNode / nextNode.speedLimit;
                            vehicle.coordinate = nextNode.coordinate; //TODO This causes vehicle to bounce back on the map if it had already gone past it
                            vehicle.nodes.RemoveAt(0);
                            vehicle.destinations.First().distance -= distanceToNextNode / nextNode.speedLimit;

                            foreach (var dest in vehicle.destinations)
                            {
                                if (dest.closestNode != null && dest.closestNode.latitude == nextNode.coordinate.latitude &&
                                    dest.closestNode.longitude == nextNode.coordinate.longitude
                                    || dest.distance <= 0)
                                {
                                    var messageData = new Program.MessageData
                                    {
                                        id = vehicle.id,
                                        route = dest.routeId,
                                        latitude = dest.coordinate.latitude,
                                        longitude = dest.coordinate.longitude
                                    };

                                    Program.client.PublishEventAsync("status", dest.isPickup ? "pickup" : "delivery", messageData);
                                }
                            }
                        }
                        else
                        {
                            double gain = adjustedRemainingDistance / distanceToNextNode;
                            double latitudeDifference = (nextNode.coordinate.latitude - vehicle.coordinate.latitude) * gain;
                            double longitudeDifference = (nextNode.coordinate.longitude - vehicle.coordinate.longitude) * gain;

                            var cord = new Coordinate
                            {
                                latitude = vehicle.coordinate.latitude + latitudeDifference,
                                longitude = vehicle.coordinate.longitude + longitudeDifference
                            };

                            vehicle.destinations.First().distance -= Util.CalculateDistance(vehicle.coordinate, cord);

                            vehicle.coordinate = cord;

                            remainingDistance -= adjustedRemainingDistance / nextNode.speedLimit;
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

    public static string GOOGLE_API_KEY = "AIzaSyD1P03JV4_NsRfuYzsvJOW5ke_tYCu6Wh0";


    [HttpPost("/random/vehicle")]
    public async void AddRandomVehicle([FromBody] RandomRequest request)
    {
        var searchRequest = new PlacesNearBySearchRequest
        {
            Key = GOOGLE_API_KEY,
            Location = new GoogleApi.Entities.Common.Coordinate(request.location.latitude, request.location.longitude),
            Radius = 1000,
        };

        var response = await GooglePlaces.Search.NearBySearch.QueryAsync(searchRequest);

        for (var i = 0; i < request.amount; i++)
        {
            var randomPlace = response.Results.ToList()[new Random().Next(0, response.Results.ToList().Count)].Geometry.Location;

            var vehicle = new Vehicle
            {
                coordinate = new Coordinate
                {
                    latitude = randomPlace.Latitude,
                    longitude = randomPlace.Longitude
                },
                maxLoad = new Random().Next(10, 100),
                company = CompanyController.companies[new Random().Next(0, CompanyController.companies.Count)].id,
                destinations = new List<Destination>(),
                nodes = new List<Node>()
            };

            Program.client.InvokeMethodAsync(HttpMethod.Post, "tracker", "add", vehicle);
        }
    }

    [HttpPost("/random/delivery")]
    public async void AddRandomDelivery([FromBody] RandomRequest request)
    {
        var searchRequest = new PlacesNearBySearchRequest
        {
            Key = GOOGLE_API_KEY,
            Location = new GoogleApi.Entities.Common.Coordinate(request.location.latitude, request.location.longitude),
            Radius = 1000,
        };

        var response = await GooglePlaces.Search.NearBySearch.QueryAsync(searchRequest);

        for (var i = 0; i < request.amount; i++)
        {
            var randomPlace1 = response.Results.ToList()[new Random().Next(0, response.Results.ToList().Count)].Geometry.Location;
            var randomPlace2 = response.Results.ToList()[new Random().Next(0, response.Results.ToList().Count)].Geometry.Location;

            int size = new Random().Next(1, 50);

            var delivery = new Delivery
            {
                pickup =
                {
                    size = size,
                    type = "cords",
                    coordinate = new Coordinate
                    {
                        latitude = randomPlace1.Latitude,
                        longitude = randomPlace1.Longitude
                    }
                },
                dropoff =
                {
                    size = size,
                    type = "cords",
                    coordinate = new Coordinate
                    {
                        latitude = randomPlace2.Latitude,
                        longitude = randomPlace2.Longitude
                    }
                }
            };

            Program.client.InvokeMethodAsync(HttpMethod.Post, "planner", "add", delivery);
        }
    }


    public class RandomRequest
    {
        public int amount { get; set; }
        public Coordinate location { get; set; }
    }

}
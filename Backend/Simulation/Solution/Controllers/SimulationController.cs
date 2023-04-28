using Microsoft.AspNetCore.Mvc;
using PolylineEncoder.Net.Utility;
using Solution.Models;

[ApiController]
[Route("[controller]")]
public class SimulationController : ControllerBase
{
    public static readonly PolylineUtility polylineEncoder = new();

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
        if (simSpeed <= 0) return;

        try
        {
            var obj = await Program.client.InvokeMethodAsync<List<Vehicle>>(HttpMethod.Get, "VehicleData", "track/all");

            foreach (var vehicle in obj)
                if (vehicle.sections.Count > 0)
                {
                    var vehicleSection = vehicle.sections.First();

                    while (vehicleSection.polyline == "" && vehicle.sections.Count > 0)
                    {
                        vehicle.sections.RemoveAt(0);
                        vehicleSection = vehicle.sections.First();
                    }

                    var speedLimit = 1; //50 km/h
                    var incrementDistance = speedLimit / (3600.0 / simSpeed); //1 km/s
                    var remainingDistance = baseDistance * incrementDistance;

                    while (remainingDistance > 0)
                    {
                        while (vehicleSection.polyline == "" && vehicle.sections.Count > 0)
                        {
                            vehicle.sections.RemoveAt(0);
                            vehicleSection = vehicle.sections.First();
                        }

                        var nodes = polylineEncoder.Decode(vehicleSection.polyline).ToList().Select(e => new Coordinate
                        {
                            latitude = e.Latitude,
                            longitude = e.Longitude
                        }).ToList();

                        if (nodes.Count == 0) break; // No more nodes to visit

                        var nextNode = nodes.First();
                        var distanceToNextNode = Util.CalculateDistance(vehicle.coordinate, nextNode);
                        var adjustedRemainingDistance = remainingDistance * vehicleSection.speedLimit;

                        if (adjustedRemainingDistance >= distanceToNextNode)
                            try
                            {
                                remainingDistance -= distanceToNextNode / vehicleSection.speedLimit;
                                vehicle.coordinate =
                                    nextNode; //TODO This causes vehicle to bounce back on the map if it had already gone past it
                                nodes.RemoveAt(0);

                                try
                                {
                                    if (vehicle.destinations is { Count: > 0 } && vehicle.destinations.First() != null)
                                        if (vehicle.destinations.First().distance is > 0)
                                            vehicle.destinations.First().distance -=
                                                distanceToNextNode / vehicleSection.speedLimit;
                                }
                                catch (Exception e)
                                {
                                    Console.WriteLine(e.ToString());
                                }

                                foreach (var dest in vehicle.destinations)
                                    try
                                    {
                                        if (dest is { closestNode: { } } && nextNode != null
                                                                         && dest.closestNode.latitude ==
                                                                         nextNode.latitude &&
                                                                         dest.closestNode.longitude ==
                                                                         nextNode.longitude)
                                        {
                                            var messageData = new Program.MessageData
                                            {
                                                id = vehicle.id,
                                                route = dest.routeId,
                                                latitude = dest.coordinate.latitude,
                                                longitude = dest.coordinate.longitude
                                            };

                                            Program.client.PublishEventAsync("status",
                                                dest.isPickup ? "pickup" : "delivery", messageData);
                                        }
                                    }
                                    catch (Exception ex)
                                    {
                                        Console.WriteLine(ex.ToString());
                                    }
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine(ex.ToString());
                            }
                        else
                            try
                            {
                                var gain = adjustedRemainingDistance / distanceToNextNode;
                                var latitudeDifference = (nextNode.latitude - vehicle.coordinate.latitude) * gain;
                                var longitudeDifference = (nextNode.longitude - vehicle.coordinate.longitude) * gain;

                                var cord = new Coordinate
                                {
                                    latitude = vehicle.coordinate.latitude + latitudeDifference,
                                    longitude = vehicle.coordinate.longitude + longitudeDifference
                                };

                                try
                                {
                                    if (vehicle.destinations is { Count: > 0 } &&
                                        vehicle.destinations.First() != null && vehicle.coordinate != null)
                                        if (vehicle.destinations.First().distance is > 0)
                                            vehicle.destinations.First().distance -=
                                                Util.CalculateDistance(vehicle.coordinate, cord);
                                }
                                catch (Exception ex)
                                {
                                    Console.WriteLine(ex.ToString());
                                }

                                vehicle.coordinate = cord;

                                remainingDistance -= adjustedRemainingDistance / vehicleSection.speedLimit;
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine(ex.ToString());
                            }

                        vehicleSection.polyline =
                            polylineEncoder.Encode(nodes.Select(e => new Tuple<double, double>(e.latitude, e.longitude))
                                .ToList());
                    }

                    await Program.client.InvokeMethodAsync(HttpMethod.Post, "VehicleData", "update", vehicle);
                }
                else if (vehicle.destinations.Count > 0)
                {
                    vehicle.destinations.Clear();
                    await Program.client.InvokeMethodAsync(HttpMethod.Post, "VehicleData", "update", vehicle);
                }
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.ToString());
        }
    }


    [HttpPost("/random/vehicle")]
    public async void AddRandomVehicle([FromBody] RandomRequest request)
    {
        var added = 0;
        Console.WriteLine("Attempting to add " + request.amount + " vehicles");

        var rows = ReadCsvFile("Addresses.csv");
        for (var i = 0; i < request.amount; i++)
        {
            var randomAddress = GetRandomRow(rows);

            Console.WriteLine("Adding vehicle at " + randomAddress);

            try
            {
                var data = new Dictionary<string, string>
                {
                    { "address", randomAddress }
                };
                var addressRequest =
                    Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "DeliveryPlanner", "address", data);
                var coordinate = await Program.client.InvokeMethodAsync<Coordinate>(addressRequest);

                var companies = await Program.client.InvokeMethodAsync<List<Company>>(
                    Program.client.CreateInvokeMethodRequest(HttpMethod.Get, "Backend", "companies"));


                var vehicle = new Vehicle
                {
                    coordinate = new Coordinate
                    {
                        latitude = coordinate.latitude,
                        longitude = coordinate.longitude
                    },
                    maxLoad = 50,
                    company = companies[new Random().Next(0, companies.Count)].id,
                    mapService = "google",
                    destinations = new List<Destination>(),
                    sections = new List<RouteSection>()
                };
                await Program.client.InvokeMethodWithResponseAsync(
                    Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "VehicleData", "add", vehicle));
                added++;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
            }

            await Task.Delay(500);
        }

        Console.WriteLine("Added " + added + " vehicles");
    }

    [HttpPost("/random/delivery")]
    public async void AddRandomDelivery([FromBody] RandomRequest request)
    {
        var added = 0;
        Console.WriteLine("Attempting to add " + request.amount + " deliveries");

        var rows = ReadCsvFile("Addresses.csv");

        for (var i = 0; i < request.amount; i++)
        {
            try
            {
                var randomAddress1 = GetRandomRow(rows);
                var randomAddress2 = GetRandomRow(rows);

                Console.WriteLine("Adding delivery from " + randomAddress1 + " to " + randomAddress2);

                var delivery = new Delivery
                {
                    pickup = new DeliveryDestination
                    {
                        size = 1,
                        type = "address",
                        address = randomAddress1
                    },
                    dropoff = new DeliveryDestination
                    {
                        size = 1,
                        type = "address",
                        address = randomAddress2
                    }
                };

                await Program.client.InvokeMethodAsync(HttpMethod.Post, "DeliveryPlanner", "add", delivery);
                added++;
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.ToString());
            }

            await Task.Delay(500);
        }

        Console.WriteLine("Added " + added + " deliveries");
    }

    public static List<string> ReadCsvFile(string filePath)
    {
        var rows = new List<string>();

        using (var reader = new StreamReader(new FileStream(filePath, FileMode.Open, FileAccess.Read)))
        {
            while (!reader.EndOfStream)
            {
                var line = reader.ReadLine().Replace(",", " ");
                if (!string.IsNullOrWhiteSpace(line)) rows.Add(line);
            }
        }

        return rows;
    }


    public static string GetRandomRow(List<string> rows)
    {
        var random = new Random();
        var randomIndex = random.Next(1, rows.Count); // Skipping the header row
        return rows[randomIndex];
    }

    public class RandomRequest
    {
        public int amount { get; set; }
        public Coordinate location { get; set; }
    }
}
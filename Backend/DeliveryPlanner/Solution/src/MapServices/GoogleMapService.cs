using Google.Api.Gax.Grpc;
using Google.Maps.Routing.V2;
using Google.Protobuf.Collections;
using Google.Protobuf.WellKnownTypes;
using Google.Type;
using GoogleApi;
using GoogleApi.Entities.Common.Enums;
using GoogleApi.Entities.Maps.Common;
using GoogleApi.Entities.Maps.Common.Enums;
using GoogleApi.Entities.Maps.DistanceMatrix.Request;
using GoogleApi.Entities.Maps.Geocoding.Address.Request;
using GoogleApi.Entities.Maps.Geocoding.Location.Request;
using Solution.Models;
using DateTime = System.DateTime;
using Location = Google.Maps.Routing.V2.Location;

namespace Solution.Pathfinder;

public class GoogleMapService : IMapService
{
    public static string API_KEY = Environment.GetEnvironmentVariable("GOOGLE_API_TOKEN");

    private static readonly RoutesClient client = new RoutesClientBuilder
    {
        GrpcAdapter = GrpcNetClientAdapter.Default,
        CredentialsPath = Environment.GetEnvironmentVariable("GOOGLE_API_PLANNER_FILE")
    }.Build();

    private static readonly CallSettings callSettings =
        CallSettings.FromHeader("X-Goog-FieldMask", "routes.legs.steps,routes.polyline.encodedPolyline");
    //private static readonly CallSettings callSettings = CallSettings.FromHeader("X-Goog-FieldMask", "*");

    private static readonly RateLimiter RoutesRateLimiter = new(5);
    private static readonly RateLimiter AddressGeocodeRateLimiter = new(5);
    private static readonly RateLimiter LocationGeocodeRateLimiter = new(5);

    private static readonly double MinSpeed = 10.0;

    public async Task<List<RouteSection>> GetPath(Vehicle vehicle)
    {
        try
        {
            Console.WriteLine($"Getting path for vehicle {vehicle.id}");

            var lastPos = vehicle.destinations.Last().coordinate;
            var wayPoints = new RepeatedField<Waypoint>();

            foreach (var destination in vehicle.destinations)
                wayPoints.Add(new Waypoint
                {
                    Location = new Location
                    {
                        LatLng = new LatLng
                        {
                            Latitude = destination.coordinate.latitude,
                            Longitude = destination.coordinate.longitude
                        }
                    }
                });

            RoutesRateLimiter.Enqueue(async () =>
            {
                Console.WriteLine("Generating low res polyline");

                var routeRequest = new ComputeRoutesRequest
                {
                    Origin = new Waypoint
                    {
                        Location = new Location
                        {
                            LatLng = new LatLng
                                { Latitude = vehicle.coordinate.latitude, Longitude = vehicle.coordinate.longitude }
                        }
                    },
                    Destination = new Waypoint
                    {
                        Location = new Location
                        {
                            LatLng = new LatLng
                                { Latitude = lastPos.latitude, Longitude = lastPos.longitude }
                        }
                    },
                    DepartureTime = Timestamp.FromDateTime(DateTime.UtcNow.AddMinutes(10)),
                    Intermediates = { wayPoints },
                    PolylineQuality = PolylineQuality.Overview,
                    TravelMode = RouteTravelMode.Drive,
                    RoutingPreference = RoutingPreference.TrafficAwareOptimal
                };

                var response = await client.ComputeRoutesAsync(routeRequest,
                    CallSettings.FromHeader("X-Goog-FieldMask", "routes.polyline.encodedPolyline"));

                if (response.Routes.Count > 0)
                {
                    var obj = await Program.client.InvokeMethodAsync<Vehicle>(
                        Program.client.CreateInvokeMethodRequest(HttpMethod.Get, "VehicleData", "track", vehicle.id));

                    obj.lowResPolyline = response.Routes.First().Polyline.EncodedPolyline;
                    await Program.client.InvokeMethodAsync(
                        Program.client.CreateInvokeMethodRequest(HttpMethod.Post, "VehicleData", "update", obj));
                    Console.WriteLine("Low res polyline generated");
                }
            });

            await RoutesRateLimiter.WaitForReadyAsync();

            var routeRequest = new ComputeRoutesRequest
            {
                Origin = new Waypoint
                {
                    Location = new Location
                    {
                        LatLng = new LatLng
                            { Latitude = vehicle.coordinate.latitude, Longitude = vehicle.coordinate.longitude }
                    }
                },
                Destination = new Waypoint
                {
                    Location = new Location
                    {
                        LatLng = new LatLng
                            { Latitude = lastPos.latitude, Longitude = lastPos.longitude }
                    }
                },
                DepartureTime = Timestamp.FromDateTime(DateTime.UtcNow.AddMinutes(1)),
                Intermediates = { wayPoints },
                PolylineQuality = PolylineQuality.HighQuality,
                TravelMode = RouteTravelMode.Drive,
                RoutingPreference = RoutingPreference.TrafficAwareOptimal
            };

            // RequestedReferenceRoutes = { ComputeRoutesRequest.Types.ReferenceRoute.FuelEfficient } //TODO This doesnt work with waypoints

            var response = await client.ComputeRoutesAsync(routeRequest, callSettings);

            try
            {
                if (response.Routes.Count > 0)
                {
                    var route = response.Routes.First();
                    var sections = new List<RouteSection>();

                    foreach (var leg in route.Legs)
                    foreach (var step in leg.Steps)
                    {
                        var stepDistanceKm = step.DistanceMeters / 1000.0; // Convert meters to kilometers
                        var stepDurationHours = step.StaticDuration.Seconds / 3600.0; // Convert seconds to hours
                        var averageSpeedKmPerHour = Math.Round(stepDistanceKm / stepDurationHours);

                        sections.Add(new RouteSection
                        {
                            polyline = step.Polyline.EncodedPolyline,
                            speedLimit = Math.Max(MinSpeed,
                                double.IsNaN(averageSpeedKmPerHour) || double.IsInfinity(averageSpeedKmPerHour)
                                    ? MinSpeed
                                    : averageSpeedKmPerHour)
                        });
                    }

                    return sections;
                }
            }
            catch (Exception e)
            {
                Console.WriteLine(e.ToString());
            }
        }
        catch (Exception e)
        {
            Console.WriteLine(e.ToString());
        }

        Console.WriteLine("No routes found");
        return new List<RouteSection>();
    }

    public async Task<Coordinate> GetAddressCoordinates(string address)
    {
        var request = new AddressGeocodeRequest
        {
            Address = address,
            Key = API_KEY
        };

        await AddressGeocodeRateLimiter.WaitForReadyAsync();

        var response = GoogleMaps.Geocode.AddressGeocode.Query(request);

        if (response.Status == Status.Ok)
        {
            var location = response.Results.First().Geometry.Location;
            return new Coordinate { latitude = location.Latitude, longitude = location.Longitude };
        }

        return null;
    }

    public async Task<string> GetClosestAddress(Coordinate coordinate)
    {
        try
        {
            if (coordinate == null) return null;

            var request = new LocationGeocodeRequest
            {
                Key = API_KEY,
                Location = new GoogleApi.Entities.Common.Coordinate(coordinate.latitude, coordinate.longitude)
            };

            await LocationGeocodeRateLimiter.WaitForReadyAsync();

            var response = await GoogleMaps.Geocode.LocationGeocode.QueryAsync(request);
            return response.Status == Status.Ok ? response.Results.First().FormattedAddress : null;
        }
        catch (Exception e)
        {
            Console.WriteLine(e.ToString());
            return null;
        }
    }

    public async Task<Vehicle> FindBestFittingVehicle(List<Vehicle> vehicles, Delivery data)
    {
        var tripDistance = await ((IMapService)this).GetDistance(
            Planner.GetDeliveryCoordinates(this, data.pickup),
            Planner.GetDeliveryCoordinates(this, data.dropoff));
        var filteredList = vehicles
            .Where(e => Planner.GetCurrentVehicleLoad(e) + data.pickup.size < e.maxLoad)
            .Where(e => e.destinations.Count <=
                        6) //Google maps api allows max 8 waypoints so only allow vehicles with 6 or less destinations
            .Where(e => Planner.GetDeliveryCoordinates(this, data.pickup) != null)
            .OrderBy(e =>
                Planner.GetShortestDistance(e, Planner.GetDeliveryCoordinates(this, data.pickup))
                    ?.Result + tripDistance)
            .ThenBy(e => e.maxLoad - Planner.GetCurrentVehicleLoad(e))
            .ToList();

        if (filteredList.Count > 10) filteredList = filteredList.GetRange(0, 10);

        if (filteredList.Count == 0) return null;

        var coordinates = new List<LocationEx>();
        filteredList.ForEach(e =>
            coordinates.Add(new LocationEx(new CoordinateEx(e.coordinate.latitude, e.coordinate.longitude))));
        var pickupCoordinate = Planner.GetDeliveryCoordinates(this, data.pickup);
        var request = new DistanceMatrixRequest
        {
            Key = API_KEY,
            Origins = coordinates,
            Destinations = new List<LocationEx>
            {
                new(new CoordinateEx(pickupCoordinate.latitude, pickupCoordinate.longitude))
            },
            TravelMode = TravelMode.Driving,
            DepartureTime = DateTime.Now
        };

        var response = await GoogleMaps.DistanceMatrix.QueryAsync(request);

        if (response.Status == Status.Ok)
        {
            if (!response.Rows.Any()) return null;

            var rows = response.Rows.Where(e => e.Elements != null && e.Elements.Any())
                .Select((row, index) => new { index, row?.Elements?.First()?.Duration?.Value });
            var tempList = new List<Vehicle>(filteredList);
            filteredList = filteredList
                .OrderBy(e => rows.ElementAt(tempList.IndexOf(e)).Value)
                .ThenBy(e => e.maxLoad - Planner.GetCurrentVehicleLoad(e))
                .ToList();
            return filteredList.First();
        }

        return null;
    }
}
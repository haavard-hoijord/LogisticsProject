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
using PolylineEncoder.Net.Utility;
using Solution.Controllers;
using Solution.Models;
using DateTime = System.DateTime;
using Location = Google.Maps.Routing.V2.Location;

namespace Solution.Pathfinder;

public class GoogleMapService : IMapService
{
    public static string API_KEY = Environment.GetEnvironmentVariable("GOOGLE_API_TOKEN");
    private static readonly PolylineUtility polylineEncoder = new();

    private static readonly RoutesClient client = new RoutesClientBuilder
    {
        GrpcAdapter = GrpcNetClientAdapter.Default,
        CredentialsPath = "logisticsproject-382306-64c1c210fd2f.json"
    }.Build();

    private static readonly CallSettings callSettings = CallSettings.FromHeader("X-Goog-FieldMask", "*");

    public async Task<List<Node>> GetPath(Vehicle vehicle)
    {
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
                    { LatLng = new LatLng { Latitude = lastPos.latitude, Longitude = lastPos.longitude } }
            },
            DepartureTime = Timestamp.FromDateTime(DateTime.UtcNow),
            TravelMode = RouteTravelMode.Drive,
            RoutingPreference = RoutingPreference.TrafficAwareOptimal,
            Intermediates = { wayPoints },
            PolylineQuality = PolylineQuality.HighQuality
        };

        var response = await client.ComputeRoutesAsync(routeRequest, callSettings);

        if (response.Routes.Count > 0)
        {
            var route = response.Routes.First();
            var points = route.Polyline.EncodedPolyline;
            var pathPoints = polylineEncoder.Decode(points)
                .Select(e => new Coordinate { longitude = e.Longitude, latitude = e.Latitude }).ToList();

            double totalDistance = 0;
            for (var i = 0; i < pathPoints.Count - 1; i++)
                totalDistance += await ((IMapService)this).GetDistance(pathPoints[i], pathPoints[i + 1]);

            // 2. Calculate the cumulative distance for each node in the OverviewPath.Points
            var cumulativeDistances = new List<double> { 0 };
            double cumulativeDistance = 0;
            for (var i = 0; i < pathPoints.Count - 1; i++)
            {
                cumulativeDistance += await ((IMapService)this).GetDistance(pathPoints[i], pathPoints[i + 1]);
                cumulativeDistances.Add(cumulativeDistance);
            }

            //TODO Make it be one string that is the polyline of the specific part of the route and then the values are the speed limits

            // 3. Iterate through the steps and assign the average speed to nodes in the OverviewPath.Points
            var nodesWithSpeedLimits = pathPoints.Select(point => new Node
            {
                coordinate = new Coordinate
                {
                    latitude = point.latitude,
                    longitude = point.longitude
                },
                speedLimit = 1
            }).ToList();

            double stepStartDistance = 0;

            foreach (var leg in route.Legs)
            foreach (var step in leg.Steps)
            {
                var stepDistanceKm = step.DistanceMeters / 1000.0; // Convert meters to kilometers
                var stepDurationHours = step.StaticDuration.Seconds / 3600.0; // Convert seconds to hours
                var averageSpeedKmPerHour = stepDistanceKm / stepDurationHours;

                var stepEndDistance = stepStartDistance + stepDistanceKm;

                for (var i = 0; i < cumulativeDistances.Count; i++)
                    if (cumulativeDistances[i] >= stepStartDistance && cumulativeDistances[i] < stepEndDistance)
                        nodesWithSpeedLimits[i].speedLimit = averageSpeedKmPerHour;

                stepStartDistance = stepEndDistance;
            }

            return nodesWithSpeedLimits;
        }

        Console.WriteLine("No routes found");
        return new List<Node>();
    }

    public async Task<Coordinate> GetAddressCoordinates(string address)
    {
        var request = new AddressGeocodeRequest
        {
            Address = address,
            Key = API_KEY
        };

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
        var request = new LocationGeocodeRequest
        {
            Key = API_KEY,
            Location = new GoogleApi.Entities.Common.Coordinate(coordinate.latitude, coordinate.longitude)
        };

        var response = GoogleMaps.Geocode.LocationGeocode.Query(request);
        return response.Status == Status.Ok ? response.Results.First().FormattedAddress : null;
    }

    public async Task<Vehicle> FindBestFittingVehicle(List<Vehicle> vehicles, Delivery data)
    {
        var tripDistance = await ((IMapService)this).GetDistance(
            PlannerController.GetDeliveryCoordinates(this, data.pickup),
            PlannerController.GetDeliveryCoordinates(this, data.dropoff));
        var filteredList = vehicles
            .Where(e => PlannerController.GetCurrentVehicleLoad(e) + data.pickup.size < e.maxLoad)
            .Where(e => e.destinations.Count <=
                        6) //Google maps api allows max 8 waypoints so only allow vehicles with 6 or less destinations
            .Where(e => PlannerController.GetDeliveryCoordinates(this, data.pickup) != null)
            .OrderBy(e =>
                PlannerController.GetShortestDistance(e, PlannerController.GetDeliveryCoordinates(this, data.pickup))
                    ?.Result + tripDistance)
            .ThenBy(e => e.maxLoad - PlannerController.GetCurrentVehicleLoad(e))
            .ToList();

        if (filteredList.Count > 10) filteredList = filteredList.GetRange(0, 10);

        if (filteredList.Count == 0) return null;

        var coordinates = new List<LocationEx>();
        filteredList.ForEach(e =>
            coordinates.Add(new LocationEx(new CoordinateEx(e.coordinate.latitude, e.coordinate.longitude))));
        var pickupCoordinate = PlannerController.GetDeliveryCoordinates(this, data.pickup);
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
                .ThenBy(e => e.maxLoad - PlannerController.GetCurrentVehicleLoad(e))
                .ToList();
            return filteredList.First();
        }

        return null;
    }
}
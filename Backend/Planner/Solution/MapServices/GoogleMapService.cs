using GoogleApi;
using GoogleApi.Entities.Common.Enums;
using GoogleApi.Entities.Maps.Common;
using GoogleApi.Entities.Maps.Common.Enums;
using GoogleApi.Entities.Maps.Directions.Request;
using GoogleApi.Entities.Maps.Directions.Response;
using GoogleApi.Entities.Maps.DistanceMatrix.Request;
using GoogleApi.Entities.Maps.Geocoding.Address.Request;
using GoogleApi.Entities.Maps.Geocoding.Location.Request;
using GoogleApi.Entities.Maps.Roads.NearestRoads.Request;
using GoogleApi.Entities.Maps.Roads.SnapToRoads.Request;
using PolylineEncoder.Net.Utility;
using Solution.Controllers;
using Solution.Models;
using Route = GoogleApi.Entities.Maps.Directions.Response.Route;
using Vehicle = Solution.Models.Vehicle;
using WayPoint = GoogleApi.Entities.Maps.Directions.Request.WayPoint;

namespace Solution.Pathfinder;

public class GoogleMapService : IMapService
{
    public static string API_KEY = "AIzaSyD1P03JV4_NsRfuYzsvJOW5ke_tYCu6Wh0";
    private static readonly PolylineUtility polylineEncoder = new();

    public async Task<List<Node>> GetPath(Vehicle vehicle)
    {
        var lastPos = vehicle.destinations.Last().coordinate;
        var wayPoints = new List<WayPoint>();

        foreach (var destination in vehicle.destinations)
            wayPoints.Add(new WayPoint(new LocationEx(new CoordinateEx(destination.coordinate.latitude,
                destination.coordinate.longitude))));

        var request = new DirectionsRequest
        {
            Key = API_KEY,
            Origin = new LocationEx(new CoordinateEx(vehicle.coordinate.latitude, vehicle.coordinate.longitude)),
            WayPoints = wayPoints,
            // OptimizeWaypoints = true,
            Destination = new LocationEx(new CoordinateEx(lastPos.latitude, lastPos.longitude))
        };

        var response = await GoogleMaps.Directions.QueryAsync(request);

        if (response.Status == Status.Ok)
        {
            Route route = response.Routes.First();
            var points = route.OverviewPath.Points;
            var pathPoints = polylineEncoder.Decode(points).Select(e => new Coordinate { longitude = e.Longitude, latitude = e.Latitude }).ToList();

            var snappedPath = new List<Coordinate>();

            for (var i = 0; i <= (pathPoints.Count / 100); i++)
            {
                if(pathPoints.Count <= (i*100))
                {
                    break;
                }

                var requestPath = pathPoints.GetRange(i * 100, Math.Min(100, (pathPoints.Count - (i*100)) - 1));
                var roadsRequest = new SnapToRoadsRequest
                {
                    Key = API_KEY,
                    Path = requestPath.Select(point => new GoogleApi.Entities.Maps.Roads.Common.Coordinate()
                    {
                        Latitude = point.latitude,
                        Longitude = point.longitude
                    }).ToList(),
                    Interpolate = true
                };

                var roadResult = await GoogleMaps.Roads.SnapToRoad.QueryAsync(roadsRequest);

                if (response.Status == Status.Ok)
                {
                    //pathPoints = roadResult.SnappedPoints.Select(e => new Coordinate { longitude = e.Location.Longitude, latitude = e.Location.Latitude }).ToList();
                    snappedPath.AddRange(roadResult.SnappedPoints.Select(e => new Coordinate { longitude = e.Location.Longitude, latitude = e.Location.Latitude }));
                }
            }

            if (snappedPath.Count > 0)
            {
                pathPoints = snappedPath;
            }

            double totalDistance = 0;
            for (int i = 0; i < pathPoints.Count - 1; i++)
            {
                totalDistance += await ((IMapService)this).GetDistance(pathPoints[i], pathPoints[i + 1]);
            }

            // 2. Calculate the cumulative distance for each node in the OverviewPath.Points
            List<double> cumulativeDistances = new List<double> { 0 };
            double cumulativeDistance = 0;
            for (int i = 0; i < pathPoints.Count - 1; i++)
            {
                cumulativeDistance += await ((IMapService)this).GetDistance(pathPoints[i], pathPoints[i + 1]);
                cumulativeDistances.Add(cumulativeDistance);
            }

            // 3. Iterate through the steps and assign the average speed to nodes in the OverviewPath.Points
            List<Node> nodesWithSpeedLimits = pathPoints.Select(point => new Node
            {
                coordinate = new Coordinate{
                    latitude = point.latitude,
                    longitude = point.longitude
                },
                speedLimit = 1
            }).ToList();

            double stepStartDistance = 0;

            foreach (Leg leg in response.Routes.First().Legs)
            {
                foreach (Step step in leg.Steps)
                {
                    double stepDistanceKm = step.Distance.Value / 1000.0; // Convert meters to kilometers
                    double stepDurationHours = step.Duration.Value / 3600.0; // Convert seconds to hours
                    double averageSpeedKmPerHour = stepDistanceKm / stepDurationHours;

                    double stepEndDistance = stepStartDistance + stepDistanceKm;

                    for (int i = 0; i < cumulativeDistances.Count; i++)
                    {
                        if (cumulativeDistances[i] >= stepStartDistance && cumulativeDistances[i] < stepEndDistance)
                        {
                            nodesWithSpeedLimits[i].speedLimit = averageSpeedKmPerHour;
                        }
                    }

                    stepStartDistance = stepEndDistance;
                }
            }

            return nodesWithSpeedLimits;
        }

        Console.WriteLine($"Google maps error: {response.Status}");
        Console.WriteLine(response.ErrorMessage);
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
        var tripDistance = await ((IMapService)this).GetDistance(data.pickup, data.dropoff);
        var filteredList = vehicles
            .Where(e => PlannerController.GetCurrentVehicleLoad(e) + data.size < e.maxLoad)
            .Where(e => e.destinations.Count <= 6)//Google maps api allows max 8 waypoints so only allow vehicles with 6 or less destinations
            .OrderBy(e => PlannerController.GetShortestDistance(e, data.pickup).Result + tripDistance)
            .ThenBy(e => e.maxLoad - PlannerController.GetCurrentVehicleLoad(e))
            .ToList();

        if (filteredList.Count > 10)
        {
            filteredList = filteredList.GetRange(0, 10);
        }

        List<LocationEx> coordinates = new List<LocationEx>();
        filteredList.ForEach(e => coordinates.Add(new LocationEx(new CoordinateEx(e.coordinate.latitude, e.coordinate.longitude))));

        var request = new DistanceMatrixRequest
        {
            Key = API_KEY,
            Origins = coordinates,
            Destinations = new List<LocationEx>
            {
                new(new CoordinateEx(data.pickup.latitude, data.pickup.longitude))
            },
            TravelMode = TravelMode.Driving,
            DepartureTime = DateTime.Now
        };

        var response = await GoogleApi.GoogleMaps.DistanceMatrix.QueryAsync(request);

        if (response.Status == Status.Ok)
        {
            var rows = response.Rows.Select((row, index) => new { index, row.Elements.First().Duration.Value });
            var tempList = new List<Vehicle>(filteredList);
            filteredList = filteredList
                .OrderBy((e) => rows.ElementAt(tempList.IndexOf(e)).Value)
                .ThenBy(e => e.maxLoad - PlannerController.GetCurrentVehicleLoad(e))
                .ToList();
            return filteredList.First();
        }

        return null;
    }
}
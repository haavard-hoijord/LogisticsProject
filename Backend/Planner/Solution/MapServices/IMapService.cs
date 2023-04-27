using Solution.Models;

namespace Solution.Pathfinder;

public interface IMapService
{
    public Task<List<RouteSection>> GetPath(Vehicle vehicle);
    public Task<Coordinate> GetAddressCoordinates(string address);
    public Task<string> GetClosestAddress(Coordinate coordinate);

    public Task<Vehicle> FindBestFittingVehicle(List<Vehicle> vehicles, Delivery data);

    public async Task<double> GetDistance(Coordinate dest1, Coordinate dest2)
    {
        return Planner.CalculateDistance(dest1, dest2);
    }
}
using Solution.Controllers;
using Solution.Models;

namespace Solution.Pathfinder;

public interface IPathService
{
    public Task<List<Coordinate>> GetPath(Vehicle vehicle);
    public Task<Coordinate> GetAddressCoordinates(String address);

    public Task<Vehicle> FindBestFittingVehicle(List<Vehicle> vehicles, Delivery data);

    public async Task<double> GetDistance(Coordinate dest1, Coordinate dest2)
    {
        return PlannerController.CalculateDistance(dest1, dest2);
    }
}
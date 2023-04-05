using Solution.Controllers;

namespace Solution.Models;

public class Destination
{
    public Coordinate coordinate { get; set; }
    public Coordinate closestNode { get; set; }
    public int routeId { get; set; }
    public bool isPickup { get; set; }
    public int load { get; set; }
}
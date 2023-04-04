using Solution.Controllers;

namespace Solution.Models;

public class Vehicle
{
    public int Id { get; set; }

    public string company { get; set; }
    public int maxLoad { get; set; }

    public Coordinate coordinate { get; set; }
    public List<Destination> destinations { get; set; }
}
using Solution.Controllers;

namespace Solution.Models;

public class Delivery
{
    public int size { get; set; }
    public Coordinate pickup { get; set; }
    public Coordinate dropoff { get; set; }

    public override string ToString()
    {
        return "Delivery: " + size + " " + pickup + " " + dropoff;
    }
}
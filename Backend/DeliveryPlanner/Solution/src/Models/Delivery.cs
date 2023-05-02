namespace Solution.Models;

public class Delivery
{
    public DeliveryDestination pickup { get; set; }
    public DeliveryDestination dropoff { get; set; }
}

public class DeliveryDestination
{
    public Package? package { get; set; }
    public string type { get; set; } = "cords"; // or "address"
    public string? address { get; set; }
    public Coordinate? coordinate { get; set; }
}
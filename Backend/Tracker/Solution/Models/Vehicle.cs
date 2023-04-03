using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Solution.Models;

public class Vehicle
{
    [Key]
    public int id { get; }

    public string Company { get; set; }
    public double Latitude { get; set; }
    public double Longitude { get; set; }

    public List<Tuple<double, double>> destinations { get; set; }
}
public class Util
{
    public static double CalculateDistance(Coordinate coord1, Coordinate coord2)
    {
        if (coord1 == null || coord2 == null)
            throw new ArgumentNullException();

        return CalculateDistance(coord1.latitude, coord1.longitude, coord2.latitude, coord2.longitude);
    }

    public static double CalculateDistance(double lat1, double lon1, double lat2, double lon2)
    {
        const double EarthRadiusInKm = 6371;

        var lat1InRadians = DegreesToRadians(lat1);
        var lon1InRadians = DegreesToRadians(lon1);
        var lat2InRadians = DegreesToRadians(lat2);
        var lon2InRadians = DegreesToRadians(lon2);

        var deltaLat = lat2InRadians - lat1InRadians;
        var deltaLon = lon2InRadians - lon1InRadians;

        var a = Math.Sin(deltaLat / 2) * Math.Sin(deltaLat / 2) +
                Math.Cos(lat1InRadians) * Math.Cos(lat2InRadians) *
                Math.Sin(deltaLon / 2) * Math.Sin(deltaLon / 2);

        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));

        return EarthRadiusInKm * c;
    }

    private static double DegreesToRadians(double degrees)
    {
        return degrees * (Math.PI / 180);
    }
}
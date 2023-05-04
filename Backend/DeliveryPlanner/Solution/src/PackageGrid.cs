using Solution.Models;

namespace Solution;

public class PackageGrid
{
    public static List<int> Fill3DArray(GridObject[,,] array, List<Package> objects)
    {
        var width = array.GetLength(0);
        var height = array.GetLength(1);
        var depth = array.GetLength(2);

        objects = objects.OrderByDescending(o => o.width * o.height * o.depth).ToList();
        var num = 0;

        foreach (var package in objects) package.routeId = num++;

        var remainingObjects = new List<Package>(objects);

        while (remainingObjects.Count > 0)
        {
            var objectPlaced = false;

            for (var i = 0; i < remainingObjects.Count; i++)
            {
                var obj = remainingObjects[i];
                var obSize = obj.width * obj.height * obj.depth;

                if (obSize <= 2 * 2 * 2)
                {
                    for (var y = 0; y < height && !objectPlaced; y++)
                    for (var x = 0; x < width && !objectPlaced; x++)
                    for (var z = 0; z < depth && !objectPlaced; z++)
                        if (ObjectFits(array, x, y, z, obj.width, obj.height, obj.depth))
                        {
                            PlaceObject(array, x, y, z, obj);
                            objectPlaced = true;
                            remainingObjects.RemoveAt(i);
                        }
                }
                else
                {
                    for (var x = 0; x < width && !objectPlaced; x++)
                    for (var y = 0; y < height && !objectPlaced; y++)
                    for (var z = 0; z < depth && !objectPlaced; z++)
                        if (ObjectFits(array, x, y, z, obj.width, obj.height, obj.depth))
                        {
                            PlaceObject(array, x, y, z, obj);
                            objectPlaced = true;
                            remainingObjects.RemoveAt(i);
                        }
                }
            }

            if (!objectPlaced) break;
        }

        var unplacedObjectIds = remainingObjects.Select(o => o.routeId.Value).ToList();
        if (unplacedObjectIds.Count > 0)
            Console.WriteLine($"Objects with IDs [{string.Join(", ", unplacedObjectIds)}] could not be placed.");

        return unplacedObjectIds;
    }

    public static bool ObjectFits(GridObject[,,] array, int x, int y, int z, int objectWidth, int objectHeight,
        int objectDepth)
    {
        if (x + objectWidth > array.GetLength(0) || y + objectHeight > array.GetLength(1) ||
            z + objectDepth > array.GetLength(2)) return false;

        if (!IsOnFloor(array, x, y, z, objectWidth, objectDepth)) return false;

        for (var dx = 0; dx < objectWidth; dx++)
        for (var dy = 0; dy < objectHeight; dy++)
        for (var dz = 0; dz < objectDepth; dz++)
            if (array[x + dx, y + dy, z + dz] != null)
                return false;

        return true;
    }

    public static bool IsOnFloor(GridObject[,,] array, int x, int y, int z, int objectWidth, int objectDepth)
    {
        if (y == 0) return true;

        for (var dx = 0; dx < objectWidth; dx++)
        for (var dz = 0; dz < objectDepth; dz++)
            if (!HasFloor(array, x + dx, y, z + dz))
                return false;
        return true;
    }

    public static void PlaceObject(GridObject[,,] array, int x, int y, int z, Package obj)
    {
        if (!obj.routeId.HasValue) Console.WriteLine("Package hasnt been assigned route id");

        for (var dx = 0; dx < obj.width; dx++)
        for (var dy = 0; dy < obj.height; dy++)
        for (var dz = 0; dz < obj.depth; dz++)
            array[x + dx, y + dy, z + dz] = new GridObject
            {
                Id = obj.routeId.Value
            };
    }

    public static bool HasFloor(GridObject[,,] array, int x, int y, int z)
    {
        return y == 0 || array[x, y - 1, z] != null;
    }
}

public class GridObject
{
    public int Id { get; set; }
}
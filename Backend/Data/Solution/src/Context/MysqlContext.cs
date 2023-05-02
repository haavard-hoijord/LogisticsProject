using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Solution.Models;
using Route = Solution.Models.Route;

namespace Solution.Context;

public class MysqlContext : DbContext
{
    public DbSet<Vehicle> vehicles { get; set; }
    public DbSet<Route> routes { get; set; }

    public DbSet<MapGrid> mapGrid { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        var connectionstring = "Server=db;Database=logistics;User=root;Password=password123;";
        optionsBuilder.UseMySql(connectionstring, ServerVersion.AutoDetect(connectionstring));
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<MapGrid>()
            .HasKey(e => new {e.latKey, e.lngKey});

        modelBuilder.Entity<Vehicle>()
            .Property(e => e.coordinate)
            .HasConversion(
                v => JsonSerializer.Serialize(v, new JsonSerializerOptions { IgnoreNullValues = true }),
                v => JsonSerializer.Deserialize<Coordinate>(v, new JsonSerializerOptions { IgnoreNullValues = true }))
            .HasColumnType("json");

        modelBuilder.Entity<Vehicle>()
            .HasOne(e => e.route)
            .WithOne()
            .HasForeignKey<Vehicle>(c => c.routeId);

        modelBuilder.Entity<Vehicle>()
            .Property(e => e.packages)
            .HasConversion(
                v => JsonSerializer.Serialize(v, new JsonSerializerOptions { IgnoreNullValues = true }),
                v => JsonSerializer.Deserialize<List<Package>>(v, new JsonSerializerOptions { IgnoreNullValues = true }))
            .HasColumnType("json");

        modelBuilder.Entity<Route>()
            .HasKey(e => e.id);

        modelBuilder.Entity<Route>()
            .Property(e => e.destinations)
            .HasConversion(
                v => JsonSerializer.Serialize(v, new JsonSerializerOptions { IgnoreNullValues = true }),
                v => JsonSerializer.Deserialize<List<Destination>>(v,
                    new JsonSerializerOptions { IgnoreNullValues = true }))
            .HasColumnType("json");

        modelBuilder.Entity<Route>()
            .Property(e => e.sections)
            .HasConversion(
                v => JsonSerializer.Serialize(v, new JsonSerializerOptions { IgnoreNullValues = true }),
                v => JsonSerializer.Deserialize<List<RouteSection>>(v,
                    new JsonSerializerOptions { IgnoreNullValues = true }))
            .HasColumnType("json");
    }
}
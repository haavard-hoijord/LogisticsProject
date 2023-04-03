using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Solution.Models;
using Pomelo.EntityFrameworkCore.MySql.Infrastructure;
namespace Solution.Context;

public class MysqlContext : DbContext
{
    public DbSet<Vehicle> Vehicles { get; set; }
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        string connectionstring = "Server=db;Database=logistics;User=root;Password=password123;";
        optionsBuilder.UseMySql(connectionstring, ServerVersion.AutoDetect(connectionstring));
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Vehicle>().HasKey(e => e.id);
        modelBuilder.Entity<Vehicle>().Property(e => e.id).ValueGeneratedOnAdd();
        modelBuilder.Entity<Vehicle>()
            .Property(e => e.destinations)
            .HasConversion(
                v => JsonSerializer.Serialize(v, new JsonSerializerOptions { IgnoreNullValues = true }),
                v => JsonSerializer.Deserialize<List<Coordinate>>(v, new JsonSerializerOptions { IgnoreNullValues = true }))
            .HasColumnType("json");
    }
}
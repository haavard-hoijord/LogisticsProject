using Dapr.Client;

public class Program
{
    public static DaprClient client;


    public static void Main(string[] args)
    {
        client = new DaprClientBuilder().Build();
        client.WaitForSidecarAsync().Wait();

        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddCors(options =>
        {
            options.AddPolicy("AllowAllOrigins",
                builder =>
                {
                    builder
                        .AllowAnyOrigin()
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                });
        });


        builder.Services.AddControllers().AddDapr();
        //builder.Services.AddControllers();
        builder.Services.AddEndpointsApiExplorer();

        builder.Services.AddSwaggerGen(c =>
        {
            c.ResolveConflictingActions(apiDescriptions => apiDescriptions.First());
        });

        var app = builder.Build();

        // Configure the HTTP request pipeline.
        if (app.Environment.IsDevelopment())
        {
            app.UseSwagger();
            app.UseSwaggerUI();
        }

        app.UseRouting();
        app.UseCors("AllowAllOrigins");
        app.UseAuthorization();
        app.UseCloudEvents();

        app.UseEndpoints(endpoints =>
        {
            endpoints.MapSubscribeHandler();
            endpoints.MapControllers();
        });

        app.MapControllers();

        app.Run();
    }
}
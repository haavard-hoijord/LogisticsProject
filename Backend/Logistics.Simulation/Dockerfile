FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build-env
WORKDIR /Logistics.Simulation

# Copy everything
COPY ./Logistics.Simulation ./
COPY ./Logistics.Models  ./
# Restore as distinct layers
RUN dotnet restore ./Logistics.Simulation.sln
# Build and publish a release
RUN dotnet publish -c Release -o out ./Logistics.Simulation.sln

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:7.0

# Install curl
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /Logistics.Simulation
COPY --from=build-env /Logistics.Simulation/out .
ENTRYPOINT ["dotnet", "Logistics.Simulation.dll"]
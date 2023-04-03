FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build-env
WORKDIR /Solution

# Copy everything
COPY . ./
# Restore as distinct layers
RUN dotnet restore ./Solution/Solution.sln
# Build and publish a release
RUN dotnet publish -c Release -o out ./Solution/Solution.sln

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:7.0
WORKDIR /Solution
COPY --from=build-env /Solution/out .
ENTRYPOINT ["dotnet", "Solution.dll"]
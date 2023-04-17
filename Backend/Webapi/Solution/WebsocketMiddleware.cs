using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;

public class WebSocketMiddleware
{
    private static readonly ConcurrentBag<WebSocket> _sockets = new();
    private readonly RequestDelegate _next;

    public WebSocketMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Path == "/ws")
            if (context.WebSockets.IsWebSocketRequest)
            {
                using var webSocket = await context.WebSockets.AcceptWebSocketAsync();
                _sockets.Add(webSocket);
                await ProcessWebSocketAsync(webSocket);
            }
            else
            {
                await _next(context);
            }
        else
            await _next(context);
    }

    private async Task ProcessWebSocketAsync(WebSocket webSocket)
    {
        var buffer = new byte[1024 * 4];
        var result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
        while (!result.CloseStatus.HasValue)
        {
            var receivedMessage = Encoding.UTF8.GetString(buffer, 0, result.Count);
            // Broadcast received message to all connected clients
            await BroadcastMessageAsync(receivedMessage);

            result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None);
        }

        await webSocket.CloseAsync(result.CloseStatus.Value, result.CloseStatusDescription, CancellationToken.None);
    }

    private async Task BroadcastMessageAsync(string message)
    {
        var messageBytes = Encoding.UTF8.GetBytes(message);
        foreach (var socket in _sockets)
            if (socket.State == WebSocketState.Open)
                await socket.SendAsync(new ArraySegment<byte>(messageBytes, 0, messageBytes.Length),
                    WebSocketMessageType.Text, true, CancellationToken.None);
    }

    public static async Task SendMessageToAllAsync(string message)
    {
        var messageBytes = Encoding.UTF8.GetBytes(message);
        foreach (var socket in _sockets)
            if (socket.State == WebSocketState.Open)
                await socket.SendAsync(new ArraySegment<byte>(messageBytes, 0, messageBytes.Length),
                    WebSocketMessageType.Text, true, CancellationToken.None);
    }
}
using System.Collections.Concurrent;
using System.Net.WebSockets;
using System.Text;

public class WebSocketMiddleware
{
    private static readonly ConcurrentDictionary<Guid, WebSocket> _sockets = new();
    private readonly RequestDelegate _next;

    public WebSocketMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (context.Request.Path == "/ws")
        {
            if (context.WebSockets.IsWebSocketRequest)
            {
                using var webSocket = await context.WebSockets.AcceptWebSocketAsync().ConfigureAwait(false);
                var socketId = Guid.NewGuid();
                _sockets.TryAdd(socketId, webSocket);
                await ProcessWebSocketAsync(webSocket, socketId).ConfigureAwait(false);
            }
            else
            {
                await _next(context).ConfigureAwait(false);
            }
        }
        else
        {
            await _next(context).ConfigureAwait(false);
        }
    }

    private async Task ProcessWebSocketAsync(WebSocket webSocket, Guid socketId)
    {
        var buffer = new byte[1024 * 4];
        WebSocketReceiveResult result;

        try
        {
            result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None)
                .ConfigureAwait(false);
            while (!result.CloseStatus.HasValue)
            {
                var receivedMessage = Encoding.UTF8.GetString(buffer, 0, result.Count);
                await BroadcastMessageAsync(receivedMessage).ConfigureAwait(false);
                result = await webSocket.ReceiveAsync(new ArraySegment<byte>(buffer), CancellationToken.None)
                    .ConfigureAwait(false);
            }
        }
        catch (WebSocketException ex) when (ex.WebSocketErrorCode == WebSocketError.ConnectionClosedPrematurely)
        {
            Console.WriteLine("WebSocket closed unexpectedly: " + ex.Message);
            result = new WebSocketReceiveResult(0, WebSocketMessageType.Close, true);
        }

        _sockets.TryRemove(socketId, out _);
        await webSocket.CloseAsync(result.CloseStatus.GetValueOrDefault(WebSocketCloseStatus.NormalClosure),
            result.CloseStatusDescription, CancellationToken.None).ConfigureAwait(false);
    }

    private async Task BroadcastMessageAsync(string message)
    {
        var messageBytes = Encoding.UTF8.GetBytes(message);
        foreach (var socket in _sockets.Values)
            if (socket.State == WebSocketState.Open)
                await socket.SendAsync(new ArraySegment<byte>(messageBytes, 0, messageBytes.Length),
                    WebSocketMessageType.Text, true, CancellationToken.None).ConfigureAwait(false);
    }

    public static async Task SendMessageToAllAsync(string message)
    {
        var messageBytes = Encoding.UTF8.GetBytes(message);
        foreach (var socket in _sockets.Values)
            if (socket.State == WebSocketState.Open)
                await socket.SendAsync(new ArraySegment<byte>(messageBytes, 0, messageBytes.Length),
                    WebSocketMessageType.Text, true, CancellationToken.None).ConfigureAwait(false);
    }
}
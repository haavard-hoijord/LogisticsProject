using System.Collections.Concurrent;

public class RateLimiter
{
    private readonly TimeSpan _interval;
    private readonly ConcurrentQueue<(Func<Task> action, int retries)> _queue;
    private readonly SemaphoreSlim _semaphore;
    private DateTime _nextRequest;
    private int _requestsPerSecond;

    public RateLimiter(int requestsPerSecond)
    {
        _requestsPerSecond = requestsPerSecond;
        _interval = TimeSpan.FromSeconds(1.0 / requestsPerSecond);
        _nextRequest = DateTime.MinValue;
        _semaphore = new SemaphoreSlim(1, 1);
        _queue = new ConcurrentQueue<(Func<Task> action, int retries)>();
        Task.Run(ProcessQueueAsync);
    }

    public async Task WaitForReadyAsync()
    {
        await _semaphore.WaitAsync();
        var currentTime = DateTime.UtcNow;
        if (currentTime < _nextRequest) await Task.Delay(_nextRequest - currentTime);
        _nextRequest = DateTime.UtcNow + _interval;
        _semaphore.Release();
    }

    private async Task ProcessQueueAsync()
    {
        while (true)
            if (_queue.TryDequeue(out var item))
            {
                await WaitForReadyAsync();

                try
                {
                    await item.action();
                }
                catch (Exception e)
                {
                    if (item.retries > 0) _queue.Enqueue((item.action, item.retries - 1));

                    Console.WriteLine(e.ToString());
                }
            }
            else
            {
                await Task.Delay(50);
            }
    }

    public void Enqueue(Func<Task> action, int maxRetries = 3)
    {
        _queue.Enqueue((action, maxRetries));
    }
}
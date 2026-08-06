"""RQ worker entrypoint. Run alongside the API process:

    python worker.py

Processes resource uploads (OCR / transcription / chunking / embeddings) off
the request path — see app/core/queue.py and app/services/pipeline.py.
"""

from rq import Worker

from app.core.queue import get_queue

if __name__ == "__main__":
    queue = get_queue()
    Worker([queue], connection=queue.connection).work()

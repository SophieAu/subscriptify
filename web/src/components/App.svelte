<script>
  import { $authStore as auth, $sessionStore as session } from "@clerk/astro/client";

  let loading = $state(true);
  let target = $state(null);
  let sources = $state([]);
  let newSourceId = $state("");
  let busy = $state(false);
  let message = $state("");
  let lastSyncedAt = $state(null);
  let started = false;

  const api = async (path, init = {}) => {
    const token = await session.get().getToken();
    const res = await fetch(`/api${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? res.statusText);
    return body;
  };

  const refresh = async () => {
    const data = await api("/sources");
    target = data.target;
    sources = data.sources;
    lastSyncedAt = data.lastSyncedAt;
  };

  $effect(() => {
    const userId = $auth.userId;
    if (userId === undefined || started) return; // Clerk still loading
    if (userId === null) {
      location.replace("/sign-in");
      return;
    }
    started = true;
    refresh().then(() => (loading = false));
  });

  const addSource = async () => {
    if (!newSourceId.trim()) return;
    busy = true;
    message = "";
    try {
      await api("/sources", {
        method: "POST",
        body: JSON.stringify({ spotifyId: newSourceId.trim() }),
      });
      newSourceId = "";
      await refresh();
    } catch (err) {
      message = `Could not add playlist: ${err.message}`;
    }
    busy = false;
  };

  const deleteSource = async (id) => {
    busy = true;
    message = "";
    try {
      await api(`/sources/${id}`, { method: "DELETE" });
      await refresh();
    } catch (err) {
      message = `Could not delete playlist: ${err.message}`;
    }
    busy = false;
  };

  const sync = async () => {
    busy = true;
    message = "Syncing…";
    try {
      const { added } = await api("/sync", { method: "POST" });
      await refresh();
      message = `Added ${added} track${added === 1 ? "" : "s"}`;
    } catch (err) {
      message = `Sync failed: ${err.message}`;
    }
    busy = false;
  };
</script>

{#if loading}
  <p>Loading…</p>
{:else}
  <main>
    <h1>Subscriptify</h1>

    <section>
      <h2>Target</h2>
      {#if target}
        <div class="playlist">
          {#if target.imageUrl}<img src={target.imageUrl} alt="" />{/if}
          <span>{target.name}</span>
        </div>
      {:else}
        <p>No target playlist seeded yet.</p>
      {/if}
    </section>

    <section>
      <h2>Sources</h2>
      {#if sources.length === 0}
        <p>No source playlists yet.</p>
      {:else}
        <ul>
          {#each sources as source (source.id)}
            <li class="playlist">
              {#if source.imageUrl}<img src={source.imageUrl} alt="" />{/if}
              <span>{source.name}</span>
              <button onclick={() => deleteSource(source.id)} disabled={busy}>
                Delete
              </button>
            </li>
          {/each}
        </ul>
      {/if}

      <form onsubmit={(e) => { e.preventDefault(); addSource(); }}>
        <input
          placeholder="Spotify playlist id"
          bind:value={newSourceId}
          disabled={busy}
        />
        <button type="submit" disabled={busy}>Add</button>
      </form>
    </section>

    <section>
      <button onclick={sync} disabled={busy}>Sync now</button>
      <p class="last-synced">
        {lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleString()}` : "Never synced"}
      </p>
      {#if message}<p>{message}</p>{/if}
    </section>
  </main>
{/if}

<style>
  main {
    max-width: 32rem;
    margin: 2rem auto;
    padding: 0 1rem;
    font-family: system-ui, sans-serif;
  }

  .last-synced {
    font-size: 0.85rem;
    color: #666;
    margin: 0.25rem 0 0;
  }

  .playlist {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .playlist img {
    width: 2.5rem;
    height: 2.5rem;
    object-fit: cover;
    border-radius: 0.25rem;
  }

  ul {
    list-style: none;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  form {
    margin-top: 1rem;
    display: flex;
    gap: 0.5rem;
  }
</style>

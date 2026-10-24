const AI_CONTEXT_KEY = "freetext_ai_context_v1";

const limitText = (value: unknown, max: number) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, max);

const safeProfile = (profile: any) => profile ? {
  id: limitText(profile.id, 80),
  username: limitText(profile.username, 80),
  full_name: limitText(profile.full_name, 120),
  avatar_url: limitText(profile.avatar_url, 300),
  bio: limitText(profile.bio, 500),
} : null;

export function syncAiContext(input: {
  profile?: any;
  posts?: any[];
  notifications?: any[];
  stories?: any[];
  messages?: any[];
}) {
  try {
    const context = {
      version: 1,
      updatedAt: new Date().toISOString(),
      profile: safeProfile(input.profile),
      posts: (input.posts || []).slice(0, 20).map(post => ({
        id: limitText(post.id, 80),
        username: limitText(post.username, 80),
        name: limitText(post.name, 120),
        caption: limitText(post.caption, 500),
        time: limitText(post.time, 80),
      })),
      notifications: (input.notifications || []).slice(0, 20).map(n => ({
        type: limitText(n.type, 80),
        message: limitText(n.message, 300),
        created_at: limitText(n.created_at, 80),
      })),
      stories: (input.stories || []).slice(0, 20).map(story => ({
        id: limitText(story.id, 80),
        username: limitText(story.username, 80),
        name: limitText(story.name, 120),
        mediaType: limitText(story.mediaType, 40),
        createdAt: limitText(story.createdAt, 80),
        expiresAt: limitText(story.expiresAt, 80),
      })),
      messages: (input.messages || []).slice(-30).map(message => ({
        id: limitText(message.id, 80),
        sender: limitText(message.sender, 20),
        text: limitText(message.text, 500),
        time: limitText(message.time, 80),
      })),
    };
    localStorage.setItem(AI_CONTEXT_KEY, JSON.stringify(context));
  } catch (error) {
    console.error("Unable to sync AI context", error);
  }
}

export function clearAiContext() {
  try { localStorage.removeItem(AI_CONTEXT_KEY); } catch {}
}

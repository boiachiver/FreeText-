import { Plus } from "lucide-react";

type StoryPerson = {
  name: string;
  username: string;
  avatar: string;
};

type StoriesProps = {
  suggestions: StoryPerson[];
  onCreateStory: () => void;
};

export default function Stories({
  suggestions,
  onCreateStory,
}: StoriesProps) {
  return (
    <section className="stories-card">
      <div className="section-title">
        <h2>Stories</h2>
        <button>See all</button>
      </div>

      <div className="stories">

        <button
          className="story add-story"
          onClick={onCreateStory}
        >
          <span className="story-add">
            <Plus size={20} />
          </span>

          <span>Your story</span>
        </button>

        {suggestions.map((person) => (
          <button
            className="story"
            key={person.username}
          >
            <span className="story-ring">
              <img
                src={person.avatar}
                alt={person.name}
                className="avatar"
                style={{
                  width: 56,
                  height: 56,
                }}
              />
            </span>

            <span>{person.username}</span>
          </button>
        ))}

      </div>
    </section>
  );
}

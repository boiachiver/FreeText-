import { Plus, PlayCircle } from "lucide-react";

export type StoryPerson = { id?: string; name: string; username: string; avatar: string; mediaUrl?: string; createdAt?: string };

type StoriesProps = { suggestions?: StoryPerson[]; onCreateStory?: () => void; onOpenStory?: (story: StoryPerson) => void };

export default function Stories({ suggestions = [], onCreateStory = () => {}, onOpenStory = () => {} }: StoriesProps) {
  return <section className="stories-card">
    <div className="section-title"><h2>Stories</h2><span>24-hour updates</span></div>
    <div className="stories">
      <button className="story add-story" onClick={onCreateStory}><span className="story-add"><Plus size={20} /></span><span>Your story</span></button>
      {suggestions.map((person, index) => <button className="story" key={person.id || person.username + index} onClick={() => onOpenStory(person)}>
        <span className="story-ring">{person.mediaUrl ? <img src={person.mediaUrl} alt={person.name} className="avatar" style={{ width: 56, height: 56 }} /> : <img src={person.avatar} alt={person.name} className="avatar" style={{ width: 56, height: 56 }} />}{person.mediaUrl && <PlayCircle size={15} />}</span><span>{person.username}</span>
      </button>)}
    </div>
  </section>;
}

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import moment from "moment";
import StoryModal from "./StoryModel";
import StoryViewer from "./StoryViewer";
import { useAuth } from "@clerk/clerk-react";
import api from "../api/axios";
import toast from "react-hot-toast";

const StoriesBar = () => {
  const { getToken } = useAuth();

  const [stories, setStories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [viewStory, setViewStory] = useState(null);

  const fetchStories = async () => {
    try {
      const token = await getToken();
      const { data } = await api.get("/api/story/get", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (data.success) {
        setStories(data.stories);
      } else {
        toast.error(data.message || "Failed to fetch stories");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  useEffect(() => {
    fetchStories();
  }, []);

  return (
    <div className="w-screen sm:w-[calc(100vw-240px)] lg:max-w-2xl no-scrollbar overflow-x-auto px-4">
      <div className="flex gap-4 pb-5">
        <div
          onClick={() => setShowModal(true)}
          className="rounded-lg shadow-sm min-w-30 max-w-30 max-h-40 aspect-3/4 cursor-pointer hover:shadow-lg transition-all duration-200 border-2 border-dashed border-indigo-300 bg-linear-to-b from-indigo-50 to-white"
        >
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="size-10 bg-indigo-500 rounded-full flex items-center justify-center mb-3">
              <Plus className="w-5 h-5 text-white" />
            </div>
            <p className="text-sm font-medium text-slate-700 text-center">
              Create Story
            </p>
          </div>
        </div>

        {stories.map((story, index) => (
          <div
            onClick={() => setViewStory(story)}
            key={index}
            className={`relative rounded-lg shadow min-w-30 max-w-30 max-h-40 aspect-3/4 cursor-pointer hover:shadow-lg transition-all duration-200 active:scale-95 overflow-hidden ${
              story.media_type === "text" ? "hover:opacity-90" : "bg-black"
            }`}
            style={{
              backgroundColor:
                story.media_type === "text" ? story.background_color : "black",
            }}
          >
            {story.media_type !== "text" && (
              <div className="absolute inset-0 z-0">
                {story.media_type === "image" ? (
                  <img
                    src={story.media_url}
                    alt="media_url"
                    className="h-full w-full object-cover opacity-70"
                  />
                ) : (
                  <video
                    src={story.media_url}
                    className="h-full w-full object-cover opacity-70"
                  />
                )}
              </div>
            )}

            <img
              src={story.user.profile_picture}
              alt="profile_picture"
              className="absolute size-8 top-3 left-3 z-10 rounded-full ring ring-gray-100 shadow"
            />

            {story.content && (
              <p
                className={`absolute top-18 left-3 z-10 text-sm truncate max-w-24 ${
                  story.media_type === "text"
                    ? "text-white/90"
                    : "text-white/80"
                }`}
              >
                {story.content}
              </p>
            )}

            <p className="text-white absolute bottom-1 right-2 z-10 text-xs">
              {moment(story.createdAt).fromNow()}
            </p>
          </div>
        ))}
      </div>

      {showModal && (
        <StoryModal setShowModal={setShowModal} setStories={setStories} />
      )}
      {viewStory && (
        <StoryViewer viewStory={viewStory} setViewStory={setViewStory} />
      )}
    </div>
  );
};

export default StoriesBar;

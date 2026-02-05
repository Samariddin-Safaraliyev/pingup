import { Star } from "lucide-react";

const ForFill = () => {
  return (
    <>
      {Array(5)
        .fill(0)
        .map((_, i) => (
          <Star
            key={i}
            className="size-4 md:size-4.5 text-transparent fill-amber-500"
          />
        ))}
    </>
  );
};

export default ForFill;

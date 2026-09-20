export default function ItemLoading() {
  return (
    <>
      <div className="page-header">
        <div className="skeleton skeleton--line" style={{ width: "7rem" }} />
        <div className="skeleton skeleton--line" style={{ width: "22rem", height: "2.2rem" }} />
        <div className="skeleton skeleton--line" style={{ width: "30rem" }} />
      </div>
      <div className="detail">
        <div className="skeleton" style={{ height: "22rem" }} />
        <div>
          <div className="skeleton skeleton--line" style={{ width: "10rem", height: "2rem" }} />
          <div className="skeleton skeleton--line" style={{ width: "100%" }} />
          <div className="skeleton skeleton--line" style={{ width: "90%" }} />
          <div className="skeleton skeleton--line" style={{ width: "70%" }} />
        </div>
      </div>
    </>
  );
}

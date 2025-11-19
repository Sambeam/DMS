//This page display all user defined course work(could be quiz, exam, assignment and project, anything that would have a grade)
//and their grades. User should be able to add and remove course work, as well as setting their weight. A logic of weight setting
//should be made to ensure it is done logically (does not exceed 100%)
import React, {useEffect,useState} from "react";
import AddButton from "../../assets/AddButton.png";
import axios from "axios";

export default function GradeView({course}){
  const[course_work, setCW] = useState([]);
  const [final_grade,setFinalGrade] = useState(0);
  const [newCW, setNewCW] = useState(0);

  useEffect(()=>{
    if(!course||!course._id)return;
    const loadCW = async () => {
    try {
      const res = await axios.get(`http://localhost:3000/api/coursework/course/${course._id}`);
      setCW(res.data);  
    } catch (err) {
      console.error("Failed to load courseworks", err);
    }
  }

  loadCW();
  }, [course]);


  useEffect(() =>{
    let weighted_grade = 0;
    for(const cw of course_work){
      weighted_grade += cw.grade * cw.weight;
    }
    setFinalGrade(weighted_grade);
  });
  
  //build a block for each course_work, and the display of the average(later become the accurate calculation of the course GPA)
  return (
    <div className="p-2">
      <h2 className="text-2xl text-gray-900 font-bold mb-4">Grades</h2>
      <div className="divide-y divide-gray-300">
      <button  className="flex items-center gap-2 px-4 pb-2 mb-2 rounded 
             bg-transparent text-blue-600 
             hover:bg-gray-200 
             focus:outline-none focus:ring-0 
             active:outline-none active:ring-0 
             border-none transition"
            style={{ outline: "none", boxShadow: "none" }}
            onClick={() => setNewCW(true)}> 
          <img src={AddButton} alt="Make Quiz" className="w-5 h-5" />
          Add a Course Work
        </button>
        {course_work.map((g) => (
          <div key={g._id} className="flex justify-between items-center py-3">
            <span className="text-gray-800 font-medium">{g.cw_name}</span>
            <span className="text-gray-700 font-semibold">{g.cw_grade}%</span>
          </div>
        ))}
        <div className="flex justify-between text-gray-800 font-semibold border-t border-gray-300 pt-2 mt-2">
            <span className="text-gray-800 font-medium">Total: </span>
            <span className="text-gray-700 font-semibold">{final_grade.toFixed(1)}%</span>
        </div>
      </div>
      {newCW && <NewCWForm course_work={course_work} course={course} setCW={setCW} onClose={() => setNewCW(false)}/>}
    </div>
  );
}

function NewCWForm({ onClose, course_work, course, setCW }){
  const [weight, setWeight] = useState(0);
  const [grade, setGrade] = useState(0);
  const [cw_name, setCWName] = useState("");

  const addCourseWork = async(e) =>{
    e.preventDefault();

    const weight_input = weight;
    if(isNaN(weight_input)){
      alert("Not a number. Please try again.");
      return
    }
    let sum = 0;
    for (const cw of course_work){
      sum += cw.weight;
      alert(cw.weight);
    }
    const total = sum + weight_input;
    if(total > 1){
      alert(sum+"The weight you set is not appropriate.");
      return;
    }else if(weight == 0 || weight == null){
      alert("you did not enter a weight");
      return;
    }

    const cw_obj={
      course_id: course._id,
      cw_name: cw_name,
      cw_grade: grade,
      cw_weight: weight
    };

    //add the cw_obj to the database//
    const response = await axios.post("http://localhost:3000/api/coursework",cw_obj);
        alert("created the obj");
      const storedCW = response.data;
      alert("successful");
      setCW((prev) => [...res.data, ...prev]);
    };

  
  return(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 w-[90%] max-w-md">
        <form onSubmit={(e) => addCourseWork(e)}>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Add a Course Work</h2>
          <p className="text-l font-semibold mb-4 text-black">Course Work Title:</p>
          <input type="text" onChange={(e) => setCWName(e.target.value)} className="w-full text-black bg-white border border-gray-300 rounded p-2 appearance-none file:bg-blue-600 file:text-white file:border-0 file:rounded file:px-3 file:py-1 hover:file:bg-blue-700 mb-4"></input>
          <p className="text-l font-semibold mb-2 text-black">Weight:</p>
          <div className="mb-4">
            <input type="number" min="0.0001" max="1" step="any" value={weight} onChange={(e) => setWeight(Number(e.target.value))} className="bg-white text-gray-900"/>
          </div>
          <p className="text-l font-semibold mb-2 text-black">Grade(%):</p>
          <div className="mb-4">
            <input type="number"  min="0.0001" max="1" step="any" value={grade} onChange={(e) => setGrade(Number(e.target.value))} className="bg-white text-gray-900"/>
          </div>
          <div className="flex gap-3 mt-4">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg hover:bg-gray-400 transition"> Cancel </button>
            <button type="submit" className="flex-1 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition"> Create </button>
          </div>
        </form>
      </div>
    </div>
  );
}
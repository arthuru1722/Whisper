import { useState } from "react";

function Botao() {

    const [text, setText] = useState("lalala")

    function click(){
        setText("macacao")
    }

    return (
        <button onClick={click} className="bg-blue-500 text-white font-bold py-2 px-4">
            {text}
        </button>
    );
}


export default Botao;



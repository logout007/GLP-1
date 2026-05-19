import { NumberInput } from "./inputs/NumberInput";
import { RadioInput } from "./inputs/RadioInput";
import { CheckboxInput } from "./inputs/CheckboxInput";
import { ComputedScreen } from "./inputs/ComputedScreen";

interface FormScreenProps {
  screen: any;
  previousAnswer: unknown;
  onNext: (value: unknown) => void;
  submitting: boolean;
  allAnswers: { screenId: number; value: unknown }[];
}

export function FormScreen({ screen, previousAnswer, onNext, submitting, allAnswers }: FormScreenProps) {
  const inputProps = { screen, previousAnswer, onNext, submitting };

  switch (screen.inputType) {
    case "number":
      return <NumberInput key={screen.id} {...inputProps} />;
    case "radio":
      return <RadioInput key={screen.id} {...inputProps} />;
    case "checkbox":
      return <CheckboxInput key={screen.id} {...inputProps} />;
    case "computed":
      return <ComputedScreen key={screen.id} {...inputProps} allAnswers={allAnswers} />;
    default:
      return <p>Unknown screen type: {screen.inputType}</p>;
  }
}

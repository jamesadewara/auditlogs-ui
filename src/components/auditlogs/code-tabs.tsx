import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CodeBlock } from "./common";

/** The same request in several languages, one tab each. The first language is selected. */
export function CodeTabs({ code }: { code: Record<string, string> }) {
  const languages = Object.keys(code);
  return (
    <Tabs defaultValue={languages[0]}>
      <TabsList className="mb-2 h-auto flex-wrap justify-start">
        {languages.map((lang) => (
          <TabsTrigger key={lang} value={lang}>
            {lang}
          </TabsTrigger>
        ))}
      </TabsList>
      {languages.map((lang) => (
        <TabsContent key={lang} value={lang}>
          <CodeBlock code={code[lang]} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

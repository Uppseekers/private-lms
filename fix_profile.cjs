const fs = require('fs');
let code = fs.readFileSync('src/pages/student/Profile.tsx', 'utf8');

const target = `      </Section>
      <div className="flex justify-end gap-4 mt-8">
        <Button variant="outline" size="lg">Discard Changes</Button>
          );
}`;
const replacement = `      </Section>

      <div className="flex justify-end gap-4 mt-8 items-center">
        {saveMessage && <span className="text-emerald-600 font-semibold">{saveMessage}</span>}
        <Button variant="outline" size="lg" type="button">Discard Changes</Button>
        <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white px-8" type="submit" disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </form>
  );
}`;
code = code.replace(target, replacement);
fs.writeFileSync('src/pages/student/Profile.tsx', code);

import { Preset, RenderPass } from '../dist/lib';

const renderPass = new RenderPass(null, null);
const preset = new Preset();
preset.name = 'name';
console.log(preset);
process.exit(0);

import fs from "fs";
import path from "path";
import chalk from "chalk";
import clone from "git-clone/promise.js";
import { CHAIN_CONFIGS } from "../config/chains.js";
import { fileURLToPath } from "url";

// Get directory name in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Gets the path to the cw3d.config.ts file
 * @param {string} baseDir The base directory to start from
 * @returns {string} The full path to the config file
 */
function getConfigPath(baseDir) {
	return path.join(baseDir, "packages", "shared", "src", "cw3d.config.ts");
}

/**
 * Writes the cw3d.config.ts file for the shared package
 * @param {string} projectDir The project root directory
 * @param {string} configContent The config content to write
 */
function writePackageConfig(projectDir, configContent) {
	const configPath = getConfigPath(projectDir);
	fs.writeFileSync(configPath, configContent);
}

/**
 * Checks if the current directory is inside a Scaffold Alchemy project
 * @returns {boolean} True if we're inside a Scaffold Alchemy project
 */
export function isInsideScaffoldAlchemyProject() {
	const currentDir = process.cwd();

	// Check for root package.json with workspaces
	const rootPackageJson = path.join(currentDir, "package.json");
	if (!fs.existsSync(rootPackageJson)) {
		return false;
	}

	try {
		const packageJson = JSON.parse(
			fs.readFileSync(rootPackageJson, "utf8")
		);
		const projectPackages = packageJson.workspaces.packages;
		if (!projectPackages || !Array.isArray(projectPackages)) {
			return false;
		}
	} catch (error) {
		return false;
	}

	// Check for shared package
	const packageDir = path.join(currentDir, "packages", "shared");
	if (!fs.existsSync(packageDir)) {
		return false;
	}

	// Check for Scaffold Alchemy config file
	const configPath = getConfigPath(currentDir);
	if (!fs.existsSync(configPath)) {
		return false;
	}

	return true;
}

export async function setupProjectDirectory(projectName, chain, inquirer) {
	const currentDir = process.cwd();
	const projectDir = path.join(currentDir, projectName);

	if (fs.existsSync(projectDir)) {
		const { overwrite } = await inquirer.prompt([
			{
				type: "confirm",
				name: "overwrite",
				message: `Directory ${projectName} already exists. Do you want to overwrite it?`,
				default: false,
			},
		]);

		if (!overwrite) {
			console.log(chalk.red("Operation cancelled"));
			process.exit(1);
		}

		fs.rmSync(projectDir, { recursive: true, force: true });
	}

	fs.mkdirSync(projectDir, { recursive: true });

	try {
		console.log(chalk.cyan("\nCloning scaffold-alchemy template..."));

		const chainConfig = CHAIN_CONFIGS.find((c) => c.shortName === chain);

		await clone(
			"https://github.com/alchemyplatform/scaffold-alchemy",
			projectDir,
			{ shallow: true }
		);

		fs.rmSync(path.join(projectDir, ".git"), {
			recursive: true,
			force: true,
		});

		const templatePath = path.join(
			__dirname,
			"../templates/cw3d.config.template"
		);
		const template = fs.readFileSync(templatePath, "utf8");

		const configContent = template
			.replace("{{mainnetName}}", chainConfig.mainnetName)
			.replace("{{mainnetChainId}}", chainConfig.mainnetChainId)
			.replace("{{testnetChainId}}", chainConfig.testnetChainId)
			.replace("{{testnetChainName}}", chainConfig.testnetChainName);

		writePackageConfig(projectDir, configContent);
	} catch (error) {
		console.error(chalk.red("\nFailed to clone template:"), error);
		process.exit(1);
	}

	return { projectDir, currentDir };
}

/**
 * Updates the Scaffold Alchemy config file with a new chain configuration
 * @param {string} chain The chain short name to configure
 * @returns {void}
 */
export function updateProjectConfig(chain) {
	const currentDir = process.cwd();
	const chainConfig = CHAIN_CONFIGS.find((c) => c.shortName === chain);

	const templatePath = path.join(
		__dirname,
		"../templates/cw3d.config.template"
	);
	const template = fs.readFileSync(templatePath, "utf8");

	const configContent = template
		.replace("{{mainnetName}}", chainConfig.mainnetName)
		.replace("{{mainnetChainId}}", chainConfig.mainnetChainId)
		.replace("{{testnetChainId}}", chainConfig.testnetChainId)
		.replace("{{testnetChainName}}", chainConfig.testnetChainName);

	writePackageConfig(currentDir, configContent);
}

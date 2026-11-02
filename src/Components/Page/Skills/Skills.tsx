import Tags from '../../Container/Tags'
import Text from '../../Text/Text'

const SKILL_GROUPS = [
  {
    title: 'FRONTEND',
    skills: [
      'React',
      'TypeScript',
      'JavaScript',
      'HTML / CSS',
      'react-i18next',
      'three.js',
      'Responsive design',
    ],
  },
  {
    title: 'BACKEND',
    skills: ['Node.js', 'Flask', 'Python', 'Java', 'REST APIs'],
  },
  {
    title: 'WAYS OF WORKING',
    skills: [
      'Git',
      'Code review',
      'Prototyping',
      'Data structures & algorithms',
    ],
  },
]

export default function Skills() {
  return (
    <>
      <Text as="h2" variant="heading">
        What's in the <em className="text-accent not-italic">shop.</em>
      </Text>
      {SKILL_GROUPS.map(({ title, skills }) => (
        <div key={title}>
          <Text as="h3" variant="label">
            {title}
          </Text>
          <Tags items={skills} />
        </div>
      ))}
      <Text variant="body" className="mt-[22px]">
        Always learning — currently going deeper on TypeScript patterns and
        creative WebGL.
      </Text>
    </>
  )
}

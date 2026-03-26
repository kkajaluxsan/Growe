<?php

namespace App\Http\Requests\Assignments;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignmentListRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'status' => ['sometimes', 'string', Rule::in(['pending', 'in_progress', 'completed'])],
            'priority' => ['sometimes', 'string', Rule::in(['LOW', 'MEDIUM', 'HIGH'])],
            'deadlineAfter' => ['sometimes', 'date'],
            'deadlineBefore' => ['sometimes', 'date'],
            'sortBy' => ['sometimes', 'string', Rule::in(['deadline', 'created_at', 'priority', 'title'])],
            'sortOrder' => ['sometimes', 'string', Rule::in(['asc', 'desc'])],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'offset' => ['sometimes', 'integer', 'min:0'],
        ];
    }
}

